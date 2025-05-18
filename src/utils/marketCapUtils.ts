import {
    erc20Abi,
    getCurrentPrice,
    getProviderTokenAddressFromBondingCurve,
} from "@/services/bondingCurveServices";
import { PublicClient, formatUnits } from "viem";

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

  let details: MarketCapDetails = {};

  try {
    details.actualProviderTokenAddress =
      await getProviderTokenAddressFromBondingCurve(
        publicClient, // Removed 'as any'
        bondingCurveAddress
      );

    if (details.actualProviderTokenAddress) {
      const fetchedTokenDecimals = (await publicClient.readContract({
        address: details.actualProviderTokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      })) as number;
      details.tokenDecimals = fetchedTokenDecimals;

      const rawTotalSupply = (await publicClient.readContract({
        address: details.actualProviderTokenAddress,
        abi: erc20Abi,
        functionName: "totalSupply",
      })) as bigint;
      details.tokenTotalSupply = formatUnits(rawTotalSupply, fetchedTokenDecimals);

      details.tokenPriceInCordex = await getCurrentPrice(
        publicClient, // Removed 'as any'
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