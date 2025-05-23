import { API_BASE_URL, TIMEFRAME_ORDER } from "@/config";

// Re-export for backward compatibility
export { TIMEFRAME_ORDER };

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
