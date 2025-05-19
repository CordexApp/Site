import {
    erc20Abi,
    getCurrentPrice,
    getProviderTokenAddressFromBondingCurve,
} from "@/services/bondingCurveServices";
import { PublicClient } from "viem";

// Cache structure with TTL (Time-to-Live)
interface CacheEntry {
  data: MarketCapDetails;
  timestamp: number;
}

// In-memory cache for market cap data
const marketCapCache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Hardcoded total supply - always 1 million
const HARDCODED_TOTAL_SUPPLY = "1000000";

export interface MarketCapDetails {
  actualProviderTokenAddress?: `0x${string}` | null;
  tokenTotalSupply?: string; // Formatted string
  tokenPriceInCordex?: string; // Formatted string
  marketCap?: string; // Formatted string (e.g., "500000.00 CRDX")
  tokenDecimals?: number;
}

export async function fetchAndCalculateMarketCap(
  publicClient: PublicClient | null | undefined,
  bondingCurveAddress: `0x${string}`
): Promise<MarketCapDetails | null> {
  if (!publicClient || !bondingCurveAddress) {
    console.warn("[MarketCapUtils] Public client or bonding curve address missing.");
    return null;
  }

  // Check cache first
  const cacheKey = bondingCurveAddress.toLowerCase();
  const currentTime = Date.now();
  const cachedData = marketCapCache[cacheKey];

  if (cachedData && (currentTime - cachedData.timestamp) < CACHE_TTL) {
    console.log(`[MarketCapUtils] Using cached market cap data for BC ${bondingCurveAddress}`);
    return cachedData.data;
  }

  let details: MarketCapDetails = {};

  try {
    details.actualProviderTokenAddress =
      await getProviderTokenAddressFromBondingCurve(
        publicClient,
        bondingCurveAddress
      );

    if (details.actualProviderTokenAddress) {
      const fetchedTokenDecimals = (await publicClient.readContract({
        address: details.actualProviderTokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      })) as number;
      details.tokenDecimals = fetchedTokenDecimals;

      // Use hardcoded total supply instead of making an RPC call
      details.tokenTotalSupply = HARDCODED_TOTAL_SUPPLY;

      details.tokenPriceInCordex = await getCurrentPrice(
        publicClient,
        bondingCurveAddress
      );

      if (details.tokenTotalSupply && details.tokenPriceInCordex) {
        const totalSupplyNum = parseFloat(details.tokenTotalSupply);
        const priceNum = parseFloat(details.tokenPriceInCordex);
        if (!isNaN(totalSupplyNum) && !isNaN(priceNum) && priceNum > 0) { // Ensure price is positive
          const marketCapNum = totalSupplyNum * priceNum;
          details.marketCap = marketCapNum.toFixed(2);
        } else {
          details.marketCap = undefined; // Or "0.00"
        }
      } else {
        details.marketCap = undefined; // Or "0.00"
      }
    } else {
      details.marketCap = undefined; // Or "0.00"
    }
    
    // Cache the results
    marketCapCache[cacheKey] = {
      data: details,
      timestamp: currentTime
    };
    
    return details;
  } catch (error) {
    console.error(
      `[MarketCapUtils] Error fetching market cap data for BC ${bondingCurveAddress}:`,
      error
    );
    return {
        actualProviderTokenAddress: details.actualProviderTokenAddress || null,
        tokenTotalSupply: details.tokenTotalSupply || undefined,
        tokenPriceInCordex: details.tokenPriceInCordex || undefined,
        marketCap: undefined, 
        tokenDecimals: details.tokenDecimals || undefined,
    };
  }
}

/**
 * Formats a number into a compact string (e.g., 1.2k, 5.6m, 1b)
 * @param value number or string representing a number
 * @returns compact formatted string
 */
export function formatCompactNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b';
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
} 