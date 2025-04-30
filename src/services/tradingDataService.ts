import { API_BASE_URL } from "@/config";

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
 * Fetch OHLCV (candlestick) data for a bonding curve
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @param timeframe Timeframe for the candles ('1m', '5m', '15m', '1h', '4h', '1d')
 * @param limit Maximum number of candles to return
 * @returns Promise with the OHLCV data response
 */
export async function getOHLCVData(
  bondingCurveAddress: string,
  timeframe: string = "1h",
  limit: number = 1000
): Promise<OHLCVResponse> {
  try {
    const url = `${API_BASE_URL}/bonding-curves/${bondingCurveAddress}/ohlcv?timeframe=${timeframe}&limit=${limit}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch OHLCV data: ${response.statusText}`);
    }

    const data = await response.json();
    return data as OHLCVResponse;
  } catch (error) {
    console.error("Error fetching OHLCV data:", error);
    return { candles: [], count: 0, timeframe };
  }
}

/**
 * Fetch available timeframes for a bonding curve
 *
 * @param bondingCurveAddress Bonding curve contract address
 * @returns Promise with available timeframes
 */
export async function getAvailableTimeframes(
  bondingCurveAddress: string
): Promise<string[]> {
  try {
    const url = `${API_BASE_URL}/bonding-curves/${bondingCurveAddress}/timeframes`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch timeframes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.timeframes || [];
  } catch (error) {
    console.error("Error fetching available timeframes:", error);
    return ["1h"]; // Default to hourly if we can't fetch
  }
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
