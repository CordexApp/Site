import { API_BASE_URL, TIMEFRAME_ORDER } from "@/config";

// Re-export for backward compatibility
export { TIMEFRAME_ORDER };

// Fast API Configuration - now pointing to the unified server on port 8000
const FAST_API_BASE_URL = "http://localhost:8000";

/**
 * Sort timeframes in chronological order (shortest to longest)
 * @param timeframes Array of timeframe strings
 * @returns Sorted array in canonical order
 */
export function sortTimeframes(timeframes: string[]): string[] {
  return timeframes.sort((a: string, b: string) => {
    const indexA = TIMEFRAME_ORDER.indexOf(a);
    const indexB = TIMEFRAME_ORDER.indexOf(b);
    
    // If timeframe is not in our known list, put it at the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });
}

export interface OHLCVCandle {
  time: number; // Unix timestamp in seconds
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface OHLCVResponse {
  candles: OHLCVCandle[];
  count: number;
  timeframe: string;
}

/**
 * Prefetch OHLCV data for multiple timeframes to improve switching performance
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @param timeframes Array of timeframes to prefetch
 * @param limit Maximum number of candles to return
 * @returns Promise with the prefetched data
 */
export async function prefetchOHLCVData(
  bondingCurveAddress: string,
  timeframes: string[] = ["1m", "5m", "15m", "1h", "4h", "1d"],
  limit: number = 1000
): Promise<Record<string, OHLCVResponse>> {
  const results: Record<string, OHLCVResponse> = {};
  
  // Fetch all timeframes in parallel for better performance
  const promises = timeframes.map(async (timeframe) => {
    try {
      const data = await getOHLCVData(bondingCurveAddress, timeframe, limit);
      return { timeframe, data };
    } catch (error) {
      console.error(`Error prefetching timeframe ${timeframe}:`, error);
      return { timeframe, data: { candles: [], count: 0, timeframe } };
    }
  });
  
  const responses = await Promise.all(promises);
  
  responses.forEach(({ timeframe, data }) => {
    results[timeframe] = data;
  });
  
  return results;
}

/**
 * Fetch OHLCV data for a bonding curve with retry logic
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @param timeframe Timeframe for the candles ('1m', '5m', '15m', '1h', '4h', '1d')
 * @param limit Maximum number of candles to return
 * @param retries Number of retry attempts (default: 3)
 * @returns Promise with the OHLCV data response
 */
export async function getOHLCVData(
  bondingCurveAddress: string,
  timeframe: string = "1h",
  limit: number = 1000,
  retries: number = 3
): Promise<OHLCVResponse> {
  const attempt = async (attemptNumber: number): Promise<OHLCVResponse> => {
    try {
      const url = `${API_BASE_URL}/bonding-curves/${bondingCurveAddress}/ohlcv?timeframe=${timeframe}&limit=${limit}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 503) {
          throw new Error(`Service temporarily unavailable (attempt ${attemptNumber}/${retries})`);
        } else if (response.status >= 500) {
          throw new Error(`Server error ${response.status} (attempt ${attemptNumber}/${retries})`);
        } else {
          throw new Error(`Failed to fetch OHLCV data: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data as OHLCVResponse;
    } catch (error) {
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`OHLCV fetch timeout (attempt ${attemptNumber}/${retries})`);
        } else if (error.message.includes('Service temporarily unavailable') || error.message.includes('Server error')) {
          console.warn(error.message);
        } else {
          console.error("Error fetching OHLCV data:", error);
        }
      }

      // Retry logic
      if (attemptNumber < retries) {
        const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 5000); // Exponential backoff, max 5s
        console.log(`Retrying OHLCV fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(attemptNumber + 1);
      }

      // Final fallback - return empty data instead of throwing
      console.error(`Failed to fetch OHLCV data after ${retries} attempts, returning empty data`);
      return { candles: [], count: 0, timeframe };
    }
  };

  return attempt(1);
}

/**
 * Fetch available timeframes for a bonding curve with retry logic
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @param retries Number of retry attempts (default: 2)
 * @returns Promise with available timeframes
 */
export async function getAvailableTimeframes(
  bondingCurveAddress: string,
  retries: number = 2
): Promise<string[]> {
  const attempt = async (attemptNumber: number): Promise<string[]> => {
    try {
      const url = `${API_BASE_URL}/bonding-curves/${bondingCurveAddress}/timeframes`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 503 || response.status >= 500) {
          throw new Error(`Service error ${response.status} (attempt ${attemptNumber}/${retries})`);
        } else {
          throw new Error(`Failed to fetch timeframes: ${response.statusText}`);
        }
      }

      const data = await response.json();
      const timeframes = data.timeframes || [];
      
      // Sort the timeframes according to the correct order
      const sortedTimeframes = sortTimeframes(timeframes);
      
      return sortedTimeframes;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`Timeframes fetch timeout (attempt ${attemptNumber}/${retries})`);
        } else if (error.message.includes('Service error')) {
          console.warn(error.message);
        } else {
          console.error("Error fetching available timeframes:", error);
        }
      }

      // Retry logic for timeframes
      if (attemptNumber < retries) {
        const delay = 1000 * attemptNumber; // Linear backoff for timeframes
        console.log(`Retrying timeframes fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(attemptNumber + 1);
      }

      // Final fallback - return default timeframe
      console.error(`Failed to fetch timeframes after ${retries} attempts, using default`);
      return ["1h"]; // Default to hourly if we can't fetch
    }
  };

  return attempt(1);
}

/**
 * Trigger a backfill of OHLCV data for a bonding curve
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @returns Promise with the result of the backfill operation
 */
export async function backfillOHLCVData(
  bondingCurveAddress: string
): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${API_BASE_URL}/bonding-curves/${bondingCurveAddress}/backfill`;

    const response = await fetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to backfill data: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Successfully backfilled data",
    };
  } catch (error) {
    console.error("Error backfilling OHLCV data:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to backfill data",
    };
  }
}

/**
 * Fast OHLCV data fetch using the optimized server
 * This bypasses the regular API and connects directly to the fast server
 * Expected performance: 3-8 seconds vs 16 seconds for chart updates
 */
export async function getOHLCVDataFast(
  bondingCurveAddress: string,
  timeframe: string = "1h",
  limit: number = 1000,
  retries: number = 2
): Promise<OHLCVResponse> {
  const attempt = async (attemptNumber: number): Promise<OHLCVResponse> => {
    try {
      const url = `${FAST_API_BASE_URL}/api/ohlcv/${bondingCurveAddress}?timeframe=${timeframe}&limit=${limit}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced timeout for fast server

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Fast server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Return in the expected format
      return {
        candles: data.candles || [],
        count: data.count || 0,
        timeframe: data.timeframe || timeframe
      };
    } catch (error) {
      console.error(`Fast OHLCV fetch error (attempt ${attemptNumber}/${retries}):`, error);

      // Retry logic for fast server
      if (attemptNumber < retries) {
        const delay = 500 * attemptNumber; // Quick retry for fast server
        console.log(`Retrying fast OHLCV fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(attemptNumber + 1);
      }

      // Return empty data if fast server fails completely
      console.error("Fast server failed after all retries, returning empty data");
      return { candles: [], count: 0, timeframe };
    }
  };

  return attempt(1);
}

/**
 * Bulk fetch OHLCV data for multiple timeframes at once
 * This significantly improves performance by reducing network requests
 */
export async function getOHLCVDataBulk(
  bondingCurveAddress: string,
  timeframes: string[] = ["1m", "5m", "15m", "1h", "4h", "1d"],
  limit: number = 1000,
  retries: number = 2
): Promise<Record<string, OHLCVResponse>> {
  const attempt = async (attemptNumber: number): Promise<Record<string, OHLCVResponse>> => {
    try {
      const timeframesParam = timeframes.join(",");
      const url = `${FAST_API_BASE_URL}/api/ohlcv/${bondingCurveAddress}/bulk?timeframes=${timeframesParam}&limit=${limit}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for bulk request

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bulk fetch error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert to the expected format
      const results: Record<string, OHLCVResponse> = {};
      for (const [timeframe, tfData] of Object.entries(data.data as any)) {
        results[timeframe] = {
          candles: tfData.candles || [],
          count: tfData.count || 0,
          timeframe: timeframe
        };
      }
      
      return results;
    } catch (error) {
      console.error(`Bulk OHLCV fetch error (attempt ${attemptNumber}/${retries}):`, error);

      // Retry logic for bulk fetch
      if (attemptNumber < retries) {
        const delay = 1000 * attemptNumber; // Progressive delay
        console.log(`Retrying bulk OHLCV fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(attemptNumber + 1);
      }

      // Fallback to individual requests if bulk fails
      console.warn("Bulk fetch failed, falling back to individual requests");
      const results: Record<string, OHLCVResponse> = {};
      for (const timeframe of timeframes) {
        try {
          results[timeframe] = await getOHLCVDataFast(bondingCurveAddress, timeframe, limit, 1);
        } catch (e) {
          console.error(`Failed to fetch ${timeframe}:`, e);
          results[timeframe] = { candles: [], count: 0, timeframe };
        }
      }
      return results;
    }
  };

  return attempt(1);
}

/**
 * Fast fetch available timeframes using the optimized server
 * This bypasses the regular API and connects directly to the fast server
 */
export async function getAvailableTimeframesFast(
  bondingCurveAddress: string,
  retries: number = 2
): Promise<string[]> {
  const attempt = async (attemptNumber: number): Promise<string[]> => {
    try {
      const url = `${FAST_API_BASE_URL}/api/timeframes/${bondingCurveAddress}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for fast server

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Fast timeframes error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const timeframes = data.timeframes || [];
      
      // Sort the timeframes according to the correct order
      const sortedTimeframes = sortTimeframes(timeframes);
      
      return sortedTimeframes;
    } catch (error) {
      console.error(`Fast timeframes fetch error (attempt ${attemptNumber}/${retries}):`, error);

      // Retry logic for fast server
      if (attemptNumber < retries) {
        const delay = 500 * attemptNumber; // Quick retry for fast server
        console.log(`Retrying fast timeframes fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(attemptNumber + 1);
      }

      // Return default timeframes if fast server fails completely
      console.error("Fast timeframes server failed after all retries, returning default timeframes");
      return ["1m", "5m", "15m", "1h", "4h", "1d"]; // Return default timeframes
    }
  };

  return attempt(1);
}

/**
 * Fast function to get coin contract address directly from blockchain
 * This bypasses the database and gets the token address from the ContractFactory
 */
export async function getCoinContractAddressFast(
  publicClient: any,
  providerContractAddress: string
): Promise<`0x${string}` | null> {
  try {
    // ContractFactory address - this should match your deployed factory
    const FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`;
    
    // First get the provider address from the provider contract
    const provider = await publicClient.readContract({
      address: providerContractAddress as `0x${string}`,
      abi: [
        {
          inputs: [],
          name: "provider",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "provider",
    });

    if (!provider || provider === "0x0000000000000000000000000000000000000000") {
      console.error("[getCoinContractAddressFast] No provider found for contract:", providerContractAddress);
      return null;
    }

    // Then get the provider token from the factory
    const tokenAddress = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: [
        {
          inputs: [{ name: "provider", type: "address" }],
          name: "getProviderToken",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getProviderToken",
      args: [provider],
    });

    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      console.error("[getCoinContractAddressFast] No token found for provider:", provider);
      return null;
    }

    console.log(`[getCoinContractAddressFast] Found token ${tokenAddress} for provider ${provider}`);
    return tokenAddress as `0x${string}`;
  } catch (error) {
    console.error("[getCoinContractAddressFast] Error getting coin contract address:", error);
    return null;
  }
}

/**
 * Refresh cache for a bonding curve - useful after trades to ensure all timeframes update quickly
 * This will invalidate the cache and prewarm with fresh data
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @param limit Number of candles to cache (default: 100)
 * @returns Promise with refresh result
 */
export async function refreshCacheForCurve(
  bondingCurveAddress: string,
  limit: number = 100
): Promise<{ success: boolean; message: string; prewarmedTimeframes?: number }> {
  try {
    const url = `${FAST_API_BASE_URL}/api/cache/refresh/${bondingCurveAddress}?limit=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Cache refresh failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("🔄 Cache refreshed for bonding curve:", bondingCurveAddress);
    return {
      success: true,
      message: data.message || "Cache refreshed successfully",
      prewarmedTimeframes: data.prewarmed_timeframes
    };
  } catch (error) {
    console.error("Cache refresh error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to refresh cache"
    };
  }
}

/**
 * Invalidate cache for a bonding curve - useful for manual cache clearing
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @returns Promise with invalidation result
 */
export async function invalidateCacheForCurve(
  bondingCurveAddress: string
): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${FAST_API_BASE_URL}/api/cache/invalidate/${bondingCurveAddress}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Cache invalidation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("🗑️ Cache invalidated for bonding curve:", bondingCurveAddress);
    return {
      success: true,
      message: data.message || "Cache invalidated successfully"
    };
  } catch (error) {
    console.error("Cache invalidation error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to invalidate cache"
    };
  }
}

/**
 * Get cache statistics for debugging
 *
 * @returns Promise with cache stats
 */
export async function getCacheStats(): Promise<any> {
  try {
    const url = `${FAST_API_BASE_URL}/api/cache/stats`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get cache stats: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return null;
  }
}
