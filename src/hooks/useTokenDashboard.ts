import { ERC20Abi } from "@/abis/ERC20";
import { TIMEFRAME_ORDER } from "@/config";
import {
  approveTokens,
  buyTokens,
  calculatePrice,
  findBondingCurveForProviderToken,
  getAccumulatedFees,
  getCordexTokenAddress,
  getCurrentPrice,
  getMaxSellableAmount,
  getSellPayoutEstimate,
  getTokenAllowance,
  getTokenSupply,
  sellTokens,
} from "@/services/bondingCurveServices";
import { getContractProvider } from "@/services/contractServices";
import {
  getCoinContractAddressFast,
  getOHLCVDataFast,
  OHLCVCandle,
  refreshCacheForCurve
} from "@/services/tradingDataService";
import { parseWalletError } from "@/utils/walletErrorUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Abi,
  decodeEventLog,
  formatEther,
  Log,
  maxUint256,
  parseAbiItem,
  parseEther,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import { useWebSocketChart } from './useWebSocketChart';

// Constants for chart display ranges
const DISPLAY_RANGE_ORDER = ["15m", "1h", "4h", "1d", "7d", "30d", "all"];
const DISPLAY_RANGE_DURATIONS: Record<string, number> = { // in milliseconds
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  // "all" will be handled by a default candle count or max available
};
const DEFAULT_ALL_TIME_CANDLE_COUNT = 2000; // Max candles to fetch for "all time"

// Types (Ensure these are defined or imported correctly)
export interface TokenInfo {
  address: `0x${string}` | null;
  name: string | null;
  symbol: string | null;
  balance: string | null;
  cordexBalance: string | null;
  totalSupply: string | null;
}

export interface BondingCurveInfo {
  currentPrice: string;
  tokenSupply: string;
  accumulatedFees: string;
  maxSellableAmount: string;
  maxBuyableAmount: string;
  cordexTokenAddress: `0x${string}` | null;
}

export interface TradingState {
  amount: string;
  estimatedCost: string;
  isApproving: boolean;
  isProcessing: boolean;
  hasAllowance: boolean;
}

interface SuccessInfo {
  message: string;
  txHash: `0x${string}`;
}

export function useTokenDashboard(
  providerContractAddress: `0x${string}`,
  options?: { 
    fetchChartDataEnabled?: boolean;
    initialCoinContractAddress?: `0x${string}` | null;
  }
) {
  const fetchChartDataEnabled = options?.fetchChartDataEnabled !== false;
  const initialCoinContractAddress = options?.initialCoinContractAddress;

  // Helper function to get timeframe duration in milliseconds
  const getTimeframeDurationMs = (timeframe: string): number => {
    if (timeframe.endsWith('m')) {
      return parseInt(timeframe.slice(0, -1)) * 60 * 1000;
    } else if (timeframe.endsWith('h')) {
      return parseInt(timeframe.slice(0, -1)) * 60 * 60 * 1000;
    } else if (timeframe.endsWith('d')) {
      return parseInt(timeframe.slice(0, -1)) * 24 * 60 * 60 * 1000;
    }
    return 0;
  };

  // Helper function to filter available display ranges based on current timeframe
  const getValidDisplayRanges = (currentTimeframe: string): string[] => {
    const timeframeDurationMs = getTimeframeDurationMs(currentTimeframe);
    if (timeframeDurationMs === 0) {
      // If we can't parse the timeframe, return all ranges
      return [...DISPLAY_RANGE_ORDER];
    }

    return DISPLAY_RANGE_ORDER.filter(range => {
      if (range === "all") return true; // "all" is always valid
      
      const rangeDurationMs = DISPLAY_RANGE_DURATIONS[range];
      if (!rangeDurationMs) return false;
      
      // Only allow display ranges that are equal to or longer than the timeframe
      return rangeDurationMs >= timeframeDurationMs;
    });
  };

  const [ownerAddress, setOwnerAddress] = useState<`0x${string}` | null>(null);
  const [bondingCurveAddress, setBondingCurveAddress] = useState<
    `0x${string}` | null
  >(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    address: null,
    name: null,
    symbol: null,
    balance: null,
    cordexBalance: null,
    totalSupply: null,
  });
  const [bondingCurveInfo, setBondingCurveInfo] = useState<BondingCurveInfo>({
    currentPrice: "0",
    tokenSupply: "0",
    accumulatedFees: "0",
    maxSellableAmount: "0",
    maxBuyableAmount: "0",
    cordexTokenAddress: null,
  });
  
  // Separate state for max buyable amount calculation
  const [isCalculatingMaxBuyable, setIsCalculatingMaxBuyable] = useState(false);
  const maxBuyableCache = useRef<{ cordexBalance: string; amount: string; timestamp: number } | null>(null);
  const [buyState, setBuyState] = useState<TradingState>({
    amount: "",
    estimatedCost: "0",
    isApproving: false,
    isProcessing: false,
    hasAllowance: false,
  });
  const [sellState, setSellState] = useState<TradingState>({
    amount: "",
    estimatedCost: "0",
    isApproving: false,
    isProcessing: false,
    hasAllowance: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);

  // Chart state
  const [chartData, setChartData] = useState<OHLCVCandle[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<string>("1m");
  const chartTimeframeRef = useRef(chartTimeframe); // Ref for the current timeframe
  const [availableTimeframes, setAvailableTimeframes] = useState<string[]>(
    [...TIMEFRAME_ORDER]
  );
  // New state for chart display range
  const [chartDisplayRange, setChartDisplayRange] = useState<string>("1d"); // Default to 1 day
  const chartDisplayRangeRef = useRef(chartDisplayRange);
  const [availableDisplayRanges, setAvailableDisplayRanges] = useState<string[]>(
    [...DISPLAY_RANGE_ORDER] // Initialize with all ranges, will be filtered in useEffect
  );
  
  // Effect to keep refs synchronized with state
  useEffect(() => {
    chartTimeframeRef.current = chartTimeframe;
  }, [chartTimeframe]);

  useEffect(() => {
    chartDisplayRangeRef.current = chartDisplayRange;
  }, [chartDisplayRange]);

  // Effect to update available display ranges when timeframe changes
  useEffect(() => {
    const validRanges = getValidDisplayRanges(chartTimeframe);
    setAvailableDisplayRanges(validRanges);

    // If current display range is no longer valid, switch to a valid one
    if (!validRanges.includes(chartDisplayRange)) {
      console.log(`[useTokenDashboard] Current display range ${chartDisplayRange} is invalid for timeframe ${chartTimeframe}, switching to ${validRanges[0]}`);
      setChartDisplayRange(validRanges[0]); // Use the first valid range
    }
  }, [chartTimeframe]); // Remove chartDisplayRange from dependencies to avoid infinite loop
  
  // Add caching for chart data with aggressive TTL strategy for real-time updates
  const chartDataCache = useRef<Record<string, { data: OHLCVCandle[], timestamp: number }>>({});
  const CHART_CACHE_TTL_MAP: Record<string, number> = {
    '1m': 5000,    // 5 seconds for 1-minute data
    '5m': 10000,   // 10 seconds for 5-minute data  
    '15m': 15000,  // 15 seconds for 15-minute data
    '1h': 30000,   // 30 seconds for 1-hour data
    '4h': 60000,   // 1 minute for 4-hour data
    '1d': 120000,  // 2 minutes for daily data
  };
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bulkDataCache = useRef<Record<string, OHLCVCandle[]> | null>(null);
  const bulkDataTimestamp = useRef<number>(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

  const publicClient = usePublicClient();
  const { address: walletAddress, chain } = useAccount();
  const {
    writeContract,
    writeContractAsync,
    isPending: isWritePending,
  } = useWriteContract();

  // Function to clear success message
  const clearSuccessMessage = () => setSuccessInfo(null);

  // Function to clear error message
  const clearErrorMessage = () => setError(null);

  // Helper function to calculate candle count based on timeframe and display range
  const calculateCandleCount = (timeframe: string, displayRange: string): number => {
    console.log(`[calculateCandleCount] Called with timeframe: ${timeframe}, displayRange: ${displayRange}`);

    if (displayRange === "all") {
      console.log(`[calculateCandleCount] Display range is "all", returning ${DEFAULT_ALL_TIME_CANDLE_COUNT} candles`);
      return DEFAULT_ALL_TIME_CANDLE_COUNT;
    }
    
    let actualTimeframeDurationMs = 0;
    if (timeframe.endsWith('m')) {
        actualTimeframeDurationMs = parseInt(timeframe.slice(0, -1)) * 60 * 1000;
    } else if (timeframe.endsWith('h')) {
        actualTimeframeDurationMs = parseInt(timeframe.slice(0, -1)) * 60 * 60 * 1000;
    } else if (timeframe.endsWith('d')) {
        actualTimeframeDurationMs = parseInt(timeframe.slice(0, -1)) * 24 * 60 * 60 * 1000;
    }

    if (actualTimeframeDurationMs === 0) { 
        console.warn(`[calculateCandleCount] Could not parse timeframe: ${timeframe}, defaulting to 200 candles`);
        return 200; 
    }

    const rangeDurationMs = DISPLAY_RANGE_DURATIONS[displayRange];
    if (!rangeDurationMs) { 
      console.warn(`[calculateCandleCount] Unknown displayRange: ${displayRange}, defaulting to ${DEFAULT_ALL_TIME_CANDLE_COUNT} candles`);
      return DEFAULT_ALL_TIME_CANDLE_COUNT; 
    }

    console.log(`[calculateCandleCount] rangeDurationMs: ${rangeDurationMs}, actualTimeframeDurationMs: ${actualTimeframeDurationMs}`);

    const idealCandleCount = Math.ceil(rangeDurationMs / actualTimeframeDurationMs);
    // Ensure at least 1 candle is requested, and cap at DEFAULT_ALL_TIME_CANDLE_COUNT
    const finalCandleCount = Math.max(1, Math.min(DEFAULT_ALL_TIME_CANDLE_COUNT, idealCandleCount));
    
    console.log(`[calculateCandleCount] idealCandleCount: ${idealCandleCount}, finalCandleCount: ${finalCandleCount}`);
    return finalCandleCount;
  };

  // Function to calculate max buyable amount (called only when needed)
  const calculateMaxBuyableAmount = async (): Promise<string> => {
    if (!publicClient || !bondingCurveAddress || !walletAddress || !bondingCurveInfo.cordexTokenAddress) {
      return "0";
    }

    try {
      setIsCalculatingMaxBuyable(true);
      
      // Get user's CORDEX balance
      const cordexBalanceBigInt = (await publicClient.readContract({
        address: bondingCurveInfo.cordexTokenAddress,
        abi: ERC20Abi as Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      })) as bigint;

      const cordexBalanceFormatted = formatEther(cordexBalanceBigInt);
      
      // Check cache
      const cacheKey = cordexBalanceFormatted;
      if (maxBuyableCache.current && 
          maxBuyableCache.current.cordexBalance === cacheKey &&
          Date.now() - maxBuyableCache.current.timestamp < 30000) { // 30 second cache
        console.log("[calculateMaxBuyableAmount] Using cached result");
        return maxBuyableCache.current.amount;
      }

      // Update CORDEX balance in tokenInfo
      setTokenInfo((prev) => {
        if (prev.cordexBalance !== cordexBalanceFormatted) {
          return { ...prev, cordexBalance: cordexBalanceFormatted };
        }
        return prev;
      });

      let maxBuyable = BigInt(0);
      
      if (cordexBalanceBigInt > BigInt(0)) {
        // Get current supply
        const supply = await getTokenSupply(publicClient, bondingCurveAddress);
        
        if (supply > BigInt(0)) {
          // Use binary search to find maximum buyable amount
          let low = BigInt(0);
          let high = supply; // Can't buy more tokens than available in the curve
          const precision = parseEther("0.001"); // Reduced precision for faster calculation
          
          while (high > low + precision && high > BigInt(0)) {
            const mid = (low + high) / BigInt(2);
            
            if (mid == BigInt(0)) {
              low = mid;
              continue;
            }
            
            try {
              const cost = await calculatePrice(publicClient, bondingCurveAddress, mid);
              
              if (cost <= cordexBalanceBigInt) {
                maxBuyable = mid;
                low = mid;
              } else {
                high = mid;
              }
            } catch (err) {
              console.error("[calculateMaxBuyableAmount] Error in binary search:", err);
              high = mid;
            }
          }
        }
      }

      const result = formatEther(maxBuyable);
      
      // Cache the result
      maxBuyableCache.current = {
        cordexBalance: cordexBalanceFormatted,
        amount: result,
        timestamp: Date.now()
      };
      
      console.log("[calculateMaxBuyableAmount] Calculated max buyable:", result);
      return result;
    } catch (err) {
      console.error("[calculateMaxBuyableAmount] Error:", err);
      return "0";
    } finally {
      setIsCalculatingMaxBuyable(false);
    }
  };

  // Function to check and update token allowances
  const checkAndUpdateAllowances = async () => {
    if (!publicClient || !walletAddress || !bondingCurveAddress) {
      return;
    }
    
    // Check cordex token allowance
    if (bondingCurveInfo.cordexTokenAddress) {
      const cachedBuyAllowance = localStorage.getItem(
        `buyAllowance-${bondingCurveInfo.cordexTokenAddress}-${walletAddress}-${bondingCurveAddress}`
      );
      
      if (cachedBuyAllowance === 'true') {
        setBuyState(prev => ({ ...prev, hasAllowance: true }));
      } else {
        const cordexAllowance = await getTokenAllowance(
          publicClient,
          bondingCurveInfo.cordexTokenAddress,
          walletAddress,
          bondingCurveAddress
        );
        
        const hasBuyAllowance = cordexAllowance > BigInt(0);
        setBuyState(prev => ({ ...prev, hasAllowance: hasBuyAllowance }));
        
        if (hasBuyAllowance) {
          localStorage.setItem(
            `buyAllowance-${bondingCurveInfo.cordexTokenAddress}-${walletAddress}-${bondingCurveAddress}`,
            'true'
          );
        }
      }
    }
    
    // Check provider token allowance
    if (tokenInfo.address) {
      const cachedSellAllowance = localStorage.getItem(
        `sellAllowance-${tokenInfo.address}-${walletAddress}-${bondingCurveAddress}`
      );
      
      if (cachedSellAllowance === 'true') {
        setSellState(prev => ({ ...prev, hasAllowance: true }));
      } else {
        const providerTokenAllowance = await getTokenAllowance(
          publicClient,
          tokenInfo.address,
          walletAddress,
          bondingCurveAddress
        );
        
        const hasSellAllowance = providerTokenAllowance > BigInt(0);
        setSellState(prev => ({ ...prev, hasAllowance: hasSellAllowance }));
        
        if (hasSellAllowance) {
          localStorage.setItem(
            `sellAllowance-${tokenInfo.address}-${walletAddress}-${bondingCurveAddress}`,
            'true'
          );
        }
      }
    }
  };

  // Base URL for block explorer (adjust based on actual network)
  const blockExplorerUrl = chain?.blockExplorers?.default.url;

  // Function to refresh just the token balance
  const refreshTokenBalance = async () => {
    if (!publicClient || !walletAddress || !tokenInfo.address) {
      // Can't fetch balance if client, wallet, or token address is missing
      return;
    }
    try {
      const balanceBigInt = (await publicClient.readContract({
        address: tokenInfo.address,
        abi: ERC20Abi as Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      })) as bigint;
      const newBalance = formatEther(balanceBigInt);
      console.log(`[TokenDashboard] Refreshed balance: ${newBalance}`);
      // Only update state if balance actually changed to avoid unnecessary re-renders
      setTokenInfo((prev) => {
        if (prev.balance !== newBalance) {
          return { ...prev, balance: newBalance };
        }
        return prev;
      });
    } catch (err) {
      console.error("[TokenDashboard] Error fetching token balance:", err);
      // Don't set main error state for just a balance refresh failure
    }
  };

  // Function to refresh CORDEX balance
  const refreshCordexBalance = async () => {
    if (!publicClient || !walletAddress || !bondingCurveInfo.cordexTokenAddress) {
      return;
    }
    try {
      const balanceBigInt = (await publicClient.readContract({
        address: bondingCurveInfo.cordexTokenAddress,
        abi: ERC20Abi as Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      })) as bigint;
      const newCordexBalance = formatEther(balanceBigInt);
      console.log(`[TokenDashboard] Refreshed CORDEX balance: ${newCordexBalance}`);
      setTokenInfo((prev) => {
        if (prev.cordexBalance !== newCordexBalance) {
          return { ...prev, cordexBalance: newCordexBalance };
        }
        return prev;
      });
    } catch (err) {
      console.error("[TokenDashboard] Error fetching CORDEX balance:", err);
    }
  };

  // Simple cache for token data
  const tokenDataCache: Record<string, { data: any; timestamp: number }> = {};
  const TOKEN_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
  
  // Hardcoded total supply - always 1 million
  const HARDCODED_TOTAL_SUPPLY = "1000000";

  // Function to refresh bonding curve data
  const refreshBondingCurveInfo = async (
    curveAddressOverride?: `0x${string}` | null
  ) => {
    console.log("🔄 [refreshBondingCurveInfo] FUNCTION CALLED - START");
    const curveAddress = curveAddressOverride || bondingCurveAddress;

    console.log("[refreshBondingCurveInfo] Function called with:", {
      publicClient: !!publicClient,
      curveAddress,
    });

    if (!publicClient || !curveAddress) {
      console.log(
        "[refreshBondingCurveInfo] Early exit - missing client or address"
      );
      return;
    }
    
    // Check cache for recent data (skip cache if we need to recalculate max sellable due to balance change)
    const cacheKey = `bc-${curveAddress}`;
    const cachedData = tokenDataCache[cacheKey];
    const now = Date.now();
    
    // Only use cache if we have user balance in both cached and current state, or neither has balance
    const shouldUseCache = cachedData && 
      (now - cachedData.timestamp) < TOKEN_CACHE_TTL &&
      (!!cachedData.data.maxSellableAmount === !!tokenInfo.balance);
    
    if (shouldUseCache) {
      console.log("[refreshBondingCurveInfo] Using cached bonding curve data");
      setBondingCurveInfo(cachedData.data);
      return;
    }

    console.log(
      "[refreshBondingCurveInfo] Starting refresh with bonding curve:",
      curveAddress
    );

    try {
      console.log(
        "[refreshBondingCurveInfo] Fetching price, supply, and cordex address..."
      );

      // Track each promise separately to identify which one might fail
      let price = "0";
      let supply = BigInt(0);
      let fees = BigInt(0);
      let cordexAddress: `0x${string}` | null = null;

      try {
        console.log("[refreshBondingCurveInfo] Getting current price...");
        price = await getCurrentPrice(publicClient, curveAddress);
        console.log("[refreshBondingCurveInfo] Price retrieved:", price);
      } catch (err) {
        console.error("[refreshBondingCurveInfo] Error getting price:", err);
      }

      try {
        console.log("[refreshBondingCurveInfo] Getting token supply...");
        supply = await getTokenSupply(publicClient, curveAddress);
        console.log(
          "[refreshBondingCurveInfo] Supply retrieved:",
          supply.toString()
        );
      } catch (err) {
        console.error("[refreshBondingCurveInfo] Error getting supply:", err);
      }

      try {
        console.log("[refreshBondingCurveInfo] Getting accumulated fees...");
        fees = await getAccumulatedFees(publicClient, curveAddress);
        console.log(
          "[refreshBondingCurveInfo] Fees retrieved:",
          fees.toString()
        );
      } catch (err) {
        console.error("[refreshBondingCurveInfo] Error getting fees:", err);
      }

      try {
        console.log(
          "[refreshBondingCurveInfo] Getting cordex token address..."
        );
        cordexAddress = await getCordexTokenAddress(publicClient, curveAddress);
        console.log(
          "[refreshBondingCurveInfo] Cordex address retrieved:",
          cordexAddress
        );
      } catch (err) {
        console.error(
          "[refreshBondingCurveInfo] Error getting cordex address:",
          err
        );
      }

      // Calculate max sellable amount if we have user balance and wallet is connected
      let maxSellable = BigInt(0);
      console.log("[refreshBondingCurveInfo] Checking conditions for max sellable calculation:", {
        walletAddress: !!walletAddress,
        tokenBalance: tokenInfo.balance,
        fees: fees.toString()
      });
      
      if (walletAddress && tokenInfo.balance) {
        try {
          console.log("[refreshBondingCurveInfo] Calling getMaxSellableAmount...");
          const userBalance = parseEther(tokenInfo.balance);
          maxSellable = await getMaxSellableAmount(
            publicClient,
            curveAddress,
            fees,
            userBalance
          );
          console.log(
            "[refreshBondingCurveInfo] Max sellable amount calculated:",
            formatEther(maxSellable)
          );
        } catch (err) {
          console.error("[refreshBondingCurveInfo] Error calculating max sellable:", err);
        }
      } else {
        console.log("[refreshBondingCurveInfo] Skipping max sellable calculation - missing conditions");
      }

      const newBondingCurveInfo = {
        currentPrice: price,
        tokenSupply: formatEther(supply),
        accumulatedFees: formatEther(fees),
        maxSellableAmount: formatEther(maxSellable),
        maxBuyableAmount: bondingCurveInfo.maxBuyableAmount || "0", // Keep existing value, don't recalculate here
        cordexTokenAddress: cordexAddress,
      };
      
      // Cache the results
      tokenDataCache[cacheKey] = {
        data: newBondingCurveInfo,
        timestamp: Date.now()
      };
      
      setBondingCurveInfo(newBondingCurveInfo);

      // Check allowances if wallet is connected
      if (walletAddress && cordexAddress && tokenInfo.address) {
        // Use the helper function to check and update allowances
        await checkAndUpdateAllowances();
      }
    } catch (err) {
      console.error(
        "[useTokenDashboard] Error refreshing bonding curve info:",
        err
      );
    }
  };

  // Helper function to proactively refresh server-side cache after trades
  const refreshServerCache = async () => {
    if (!bondingCurveAddress) return;
    
    console.log("[useTokenDashboard] Proactively refreshing server cache...");
    try {
      const result = await refreshCacheForCurve(bondingCurveAddress, 200); // Cache more data
      if (result.success) {
        console.log(`[useTokenDashboard] Server cache refreshed successfully for ${result.prewarmedTimeframes} timeframes`);
      } else {
        console.warn("[useTokenDashboard] Server cache refresh failed:", result.message);
      }
    } catch (error) {
      console.error("[useTokenDashboard] Error refreshing server cache:", error);
    }
  };

  // Helper function to invalidate all chart caches
  const invalidateAllChartCaches = () => {
    console.log("[useTokenDashboard] Invalidating all chart caches");
    chartDataCache.current = {};
    bulkDataCache.current = null;
    bulkDataTimestamp.current = 0;
  };

  // Memoize callback functions to prevent infinite re-renders
  const onChartUpdate = useCallback((data: any, tradeData?: any) => {
    const updateStart = Date.now();
    console.log(`[useTokenDashboard] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Received real-time chart update (state TF: ${chartTimeframeRef.current})`);
    
    const activeTimeframeForUpdate = chartTimeframeRef.current; // Use the latest value from the ref
    const activeDisplayRange = chartDisplayRangeRef.current; // Use the latest value from the ref

    // Update chart data with the current timeframe from ref
    if (data[activeTimeframeForUpdate]) {
      const chartUpdateStart = Date.now();
      const allCandles = data[activeTimeframeForUpdate].candles as OHLCVCandle[];
      const expectedCount = calculateCandleCount(activeTimeframeForUpdate, activeDisplayRange);
      
      const candlesToDisplay = allCandles.slice(-expectedCount).sort((a, b) => a.time - b.time);
      
      setChartData(candlesToDisplay);
      const chartUpdateTime = Date.now() - chartUpdateStart;
      console.log(`[useTokenDashboard] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Chart data updated for ${activeTimeframeForUpdate} / ${activeDisplayRange}. Received ${allCandles.length}, Displaying last ${candlesToDisplay.length} (expected ${expectedCount}) in ${chartUpdateTime}ms`);
    }
    
    // If there's trade data, it means a new trade occurred
    if (tradeData) {
      console.log(`[useTokenDashboard] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] New trade detected, refreshing contract info`);
      // Refresh contract info when new trades come in
      refreshBondingCurveInfo();
      
      // Refresh user balance if the trade was from current user
      if (tradeData.user_address && walletAddress && 
          tradeData.user_address.toLowerCase() === walletAddress.toLowerCase()) {
        console.log(`[useTokenDashboard] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Trade from current user, refreshing token balance`);
        refreshTokenBalance();
      }
    }
    
    const totalUpdateTime = Date.now() - updateStart;
    console.log(`[useTokenDashboard] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] TOTAL chart update callback completed in ${totalUpdateTime}ms`);
  }, [walletAddress, refreshBondingCurveInfo, refreshTokenBalance]);

  const onConnectionStatusChange = useCallback((connected: boolean) => {
    console.log(`[useTokenDashboard] WebSocket connection: ${connected ? 'connected' : 'disconnected'}`);
  }, []);

  // Replace polling-based chart data with WebSocket
  const {
    chartData: wsChartData,
    isConnected: wsConnected,
    connectionError: wsError,
    requestData: requestWsData,
    lastTradeData,
    reconnect: reconnectWs
  } = useWebSocketChart({
    bondingCurveAddress: bondingCurveAddress,
    enabled: fetchChartDataEnabled && !!bondingCurveAddress,
    onChartUpdate,
    onConnectionStatusChange
  });

  // Handle timeframe changes with WebSocket
  const handleTimeframeChange = (newTimeframe: string) => {
    console.log(`[useTokenDashboard] Timeframe change: ${chartTimeframeRef.current} -> ${newTimeframe}`);
    setChartTimeframe(newTimeframe); // This will update chartTimeframeRef via its own useEffect

    const currentDR = chartDisplayRangeRef.current;
    const candleCount = calculateCandleCount(newTimeframe, currentDR);
    
    // Update chart data immediately if we have WebSocket data for the new timeframe
    if (wsChartData && wsChartData[newTimeframe]) {
      const allCandles = wsChartData[newTimeframe].candles as OHLCVCandle[];
      
      // Take the last candleCount candles (most recent) and ensure they are in ascending order
      const candlesToDisplay = allCandles.slice(-candleCount).sort((a, b) => a.time - b.time);
      
      console.log(`[useTokenDashboard] handleTimeframeChange: Setting chartData with ${candlesToDisplay.length} candles for ${newTimeframe}/${currentDR}.`);
      setChartData(candlesToDisplay);
    } else {
      // Request data for the new timeframe via WebSocket
      console.log(`[useTokenDashboard] handleTimeframeChange: Requesting ${candleCount} candles for ${newTimeframe} / ${currentDR} via WebSocket.`);
      setChartData([]); // Clear existing data while new data is fetched
      requestWsData(newTimeframe, candleCount);
    }
  };

  // New handler for display range changes
  const handleDisplayRangeChange = (newDisplayRange: string) => {
    console.log(`[useTokenDashboard] Display range change: ${chartDisplayRangeRef.current} -> ${newDisplayRange}`);
    setChartDisplayRange(newDisplayRange); // This will update chartDisplayRangeRef via its own useEffect

    const currentTF = chartTimeframeRef.current;
    const candleCount = calculateCandleCount(currentTF, newDisplayRange);
    console.log(`[useTokenDashboard] handleDisplayRangeChange: Requesting ${candleCount} candles for ${currentTF} / ${newDisplayRange} via WebSocket.`);
    setChartData([]); // Clear existing data
    requestWsData(currentTF, candleCount);
  };

  // Fallback to HTTP polling if WebSocket fails
  const fetchChartDataHTTP = async (timeframe: string) => {
    if (!bondingCurveAddress) {
      setChartData([]);
      return;
    }
    
    const currentDisplayRange = chartDisplayRangeRef.current;
    const candleCountToRequest = calculateCandleCount(timeframe, currentDisplayRange);
    console.log(`[fetchChartDataHTTP] Requesting ${candleCountToRequest} candles for ${timeframe} / ${currentDisplayRange} via HTTP.`);
    
    try {
      // Assuming getOHLCVDataFast respects candleCountToRequest for "latest N" or returns enough data to slice
      const response = await getOHLCVDataFast(bondingCurveAddress, timeframe, candleCountToRequest);
      const allCandles = response.candles as OHLCVCandle[];
      // Always slice to ensure we only use the latest N, conforming to the displayRange intention
      const candlesToDisplay = allCandles.slice(-candleCountToRequest);
      
      if (candlesToDisplay.length > 0) {
        console.log(`[fetchChartDataHTTP] Received ${allCandles.length} candles, displaying last ${candlesToDisplay.length} for ${timeframe} / ${currentDisplayRange}`);
        setChartData(candlesToDisplay);
      } else {
        console.log(`[fetchChartDataHTTP] Received 0 displayable candles for ${timeframe} / ${currentDisplayRange}`);
        setChartData([]);
      }
    } catch (error) {
      console.error('[useTokenDashboard] HTTP fallback failed:', error);
      setChartData([]);
    }
  };

  // Use HTTP fallback if WebSocket is not connected
  useEffect(() => {
    if (fetchChartDataEnabled && bondingCurveAddress && !wsConnected && wsError) {
      console.log('[useTokenDashboard] WebSocket failed, using HTTP fallback');
      fetchChartDataHTTP(chartTimeframeRef.current); // Use ref for current timeframe
    }
  }, [fetchChartDataEnabled, bondingCurveAddress, wsConnected, wsError, chartTimeframeRef.current]); // Ensure ref is dependency if its value matters for triggering

  // Initial chart data load when bondingCurveAddress changes or WebSocket connects
  useEffect(() => {
    if (fetchChartDataEnabled && bondingCurveAddress && wsConnected) {
      const currentTF = chartTimeframeRef.current;
      const currentDR = chartDisplayRangeRef.current;
      const candleCount = calculateCandleCount(currentTF, currentDR);
      console.log(`[useTokenDashboard] Initial chart data load: Requesting ${candleCount} candles for ${currentTF} / ${currentDR} via WebSocket.`);
      requestWsData(currentTF, candleCount);
    }
  }, [fetchChartDataEnabled, bondingCurveAddress, wsConnected]); // Removed chartTimeframe, chartDisplayRange, rely on refs inside

  // Effect to update main chartData when wsChartData (from WebSocket hook) has new data for the current timeframe
  useEffect(() => {
    const currentTF = chartTimeframeRef.current;
    const currentDR = chartDisplayRangeRef.current;

    if (wsChartData && wsChartData[currentTF]) {
      const allCandles = wsChartData[currentTF].candles as OHLCVCandle[];
      const expectedCount = calculateCandleCount(currentTF, currentDR);
      
      console.log(`[useTokenDashboard] useEffect[wsChartData]: Setting chartData for ${currentTF}/${currentDR}. Received ${allCandles.length}, displaying ${expectedCount} candles.`);
      
      // Take the last expectedCount candles (most recent) and ensure they are in ascending order
      const candlesToDisplay = allCandles.slice(-expectedCount).sort((a, b) => a.time - b.time);
      
      setChartData(candlesToDisplay);
    } else if (wsChartData && !wsChartData[currentTF]) {
      console.log(`[useTokenDashboard] useEffect[wsChartData]: wsChartData present, but no data for current timeframe ${currentTF}. Waiting for fetch.`);
    }
  }, [wsChartData, chartTimeframeRef, chartDisplayRangeRef]);

  // Define the event ABI item string for parsing
  const tradeActivityEventAbi = parseAbiItem(
    "event TradeActivity(address indexed user, bool indexed isBuy, uint256 timestamp, uint256 tokenAmount, uint256 pricePerToken, uint256 totalVolume, uint256 poolLiquidity)"
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!publicClient) {
        console.error(
          "[useTokenDashboard] Missing publicClient, cannot fetch data"
        );
        setError("Cannot connect to network");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("[useTokenDashboard] Fetching data for:", providerContractAddress);

        // First, we need the owning provider's address and provider token
        const provider = await getContractProvider(
          publicClient,
          providerContractAddress
        );
        console.log("[useTokenDashboard] Provider:", provider);
        
        if (!provider || provider === "0x0000000000000000000000000000000000000000") {
          throw new Error("Provider address not found");
        }
        
        setOwnerAddress(provider as `0x${string}`);

        let tokenAddress: `0x${string}` | null | undefined = initialCoinContractAddress;

        if (!tokenAddress) {
          // Fallback to fetching directly from blockchain (bypassing database)
          console.log("[useTokenDashboard] initialCoinContractAddress not provided, fetching token address directly from blockchain for providerContractAddress:", providerContractAddress);
          tokenAddress = await getCoinContractAddressFast(publicClient, providerContractAddress);
          console.log("[useTokenDashboard] Token address from blockchain:", tokenAddress);

          if (!tokenAddress) {
            throw new Error("Token address could not be determined from blockchain");
          }
        } else {
          console.log("[useTokenDashboard] Using provided initialCoinContractAddress:", tokenAddress);
        }
        
        if (!tokenAddress) { // Final check if tokenAddress is still null/undefined
             throw new Error("Coin contract address could not be determined.");
        }

        // Now read token details (symbol, name)
        console.log("[useTokenDashboard] Reading token details for:", tokenAddress);
        const tokenSymbol = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20Abi as Abi,
          functionName: "symbol",
        })) as string;
        
        const tokenName = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20Abi as Abi,
          functionName: "name",
        })) as string;

        // Use hardcoded total supply instead of making an RPC call
        const totalSupply = HARDCODED_TOTAL_SUPPLY;
        console.log("[useTokenDashboard] Using hardcoded token total supply:", totalSupply);

        // Update token information state
        const newTokenInfo = {
          address: tokenAddress,
          name: tokenName,
          symbol: tokenSymbol,
          balance: null, // Will be updated separately if wallet is connected
          cordexBalance: null, // Will be updated separately if wallet is connected
          totalSupply: totalSupply, // Add total supply
        };
        setTokenInfo(newTokenInfo);

        // Step 4: Find the bonding curve using owner and token address
        console.log(
          `[TokenDashboard] Finding bonding curve for owner ${provider} and token ${tokenAddress}`
        );
        const bondingCurve = await findBondingCurveForProviderToken(
          publicClient,
          provider as `0x${string}`,
          tokenAddress
        );
        setBondingCurveAddress(bondingCurve);
        console.log(
          `[TokenDashboard] Found bonding curve address: ${bondingCurve}`
        );

        // If we found a bonding curve, get its details
        if (bondingCurve) {
          console.log(
            `[TokenDashboard] About to call refreshBondingCurveInfo with bonding curve: ${bondingCurve}`
          );
          await refreshBondingCurveInfo(bondingCurve);
          console.log(
            `[TokenDashboard] Completed refreshBondingCurveInfo call`
          );
          
          // Also fetch token balance if wallet is connected (but don't refresh again)
          if (walletAddress && tokenAddress) {
            console.log("[TokenDashboard] Fetching initial token balance...");
            try {
              const balanceBigInt = (await publicClient.readContract({
                address: tokenAddress,
                abi: ERC20Abi as Abi,
                functionName: "balanceOf",
                args: [walletAddress],
              })) as bigint;
              const balance = formatEther(balanceBigInt);
              console.log(`[TokenDashboard] Initial balance fetched: ${balance}`);
              
              // Update token info with balance (the useEffect will handle the refresh)
              setTokenInfo((prev) => ({ ...prev, balance }));
            } catch (err) {
              console.error("[TokenDashboard] Error fetching initial balance:", err);
            }
          }
        }
      } catch (err) {
        console.error("[TokenDashboard] Error fetching dashboard data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load token information"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (providerContractAddress && publicClient) {
      fetchData();
    }

    return () => {
      // Cleanup logic if needed when dependencies change or component unmounts
      setIsLoading(true);
      setError(null);
    };
  }, [providerContractAddress, publicClient, walletAddress]);

  // Check token allowances whenever relevant addresses change
  useEffect(() => {
    if (publicClient && walletAddress && bondingCurveAddress && 
        (bondingCurveInfo.cordexTokenAddress || tokenInfo.address)) {
      checkAndUpdateAllowances();
    }
  }, [
    publicClient, 
    walletAddress, 
    bondingCurveAddress, 
    bondingCurveInfo.cordexTokenAddress, 
    tokenInfo.address
  ]);

  // Refresh bonding curve info when token balance changes to recalculate max sellable amount
  useEffect(() => {
    if (publicClient && bondingCurveAddress && tokenInfo.balance && walletAddress) {
      console.log("[useTokenDashboard] Token balance changed, recalculating max sellable amount");
      refreshBondingCurveInfo();
    }
  }, [tokenInfo.balance, publicClient, bondingCurveAddress, walletAddress]);

  // Refresh CORDEX balance when cordex token address becomes available
  useEffect(() => {
    if (publicClient && walletAddress && bondingCurveInfo.cordexTokenAddress) {
      console.log("[useTokenDashboard] CORDEX token address available, fetching CORDEX balance");
      refreshCordexBalance();
    }
  }, [publicClient, walletAddress, bondingCurveInfo.cordexTokenAddress]);

  // Add Contract Event Listener with ultra-fast polling for immediate trade detection
  useWatchContractEvent({
    address: bondingCurveAddress || undefined,
    abi: [tradeActivityEventAbi],
    eventName: "TradeActivity",
    enabled: !!bondingCurveAddress,
    // Ultra-aggressive polling for real-time updates
    poll: true,
    pollingInterval: 500, // Poll every 500ms for immediate event detection
    onLogs(logs: Log[]) {
      console.log("[useTokenDashboard] TradeActivity Event Received:", logs);
      logs.forEach((log) => {
        try {
          // Ensure log structure is valid before decoding
          if (log.data && log.topics) {
            const decodedLog = decodeEventLog({
              abi: [tradeActivityEventAbi],
              data: log.data,
              topics: log.topics,
            });

            // Check if decoding was successful and args exist
            if (decodedLog && decodedLog.args) {
              const args = decodedLog.args as {
                user?: `0x${string}` /* other args */;
              };
              console.log("[useTokenDashboard] Decoded Event Args:", args);

              // Refresh contract info immediately
              refreshBondingCurveInfo();

              // Refresh balance immediately if user matches
              if (
                args.user &&
                walletAddress &&
                args.user.toLowerCase() === walletAddress.toLowerCase()
              ) {
                console.log(
                  "[useTokenDashboard] Trade event matches current user, refreshing balance..."
                );
                refreshTokenBalance();
              }

              // Immediate cache refresh and chart update for ANY trade
              console.log(
                "[useTokenDashboard] Trade detected - immediate refresh..."
              );
              
              // Parallel refresh execution
              const eventRefreshPromises = [
                refreshServerCache(),
                refreshBondingCurveInfo()
              ];
              
              Promise.all(eventRefreshPromises).then(() => {
                console.log("[useTokenDashboard] Event-triggered refreshes completed");
                
                // Invalidate all cached chart data and fetch fresh data immediately
                invalidateAllChartCaches();
                const currentTF = chartTimeframeRef.current;
                const currentDR = chartDisplayRangeRef.current;
                const candleCount = calculateCandleCount(currentTF, currentDR);
                console.log(`[useTokenDashboard] Post-event: Requesting ${candleCount} candles for ${currentTF} / ${currentDR} via WebSocket.`);
                requestWsData(currentTF, candleCount); 
              }).catch(error => {
                console.error("[useTokenDashboard] Error in event refresh:", error);
                // Still try to fetch fresh chart data
                invalidateAllChartCaches();
                const currentTF = chartTimeframeRef.current;
                const currentDR = chartDisplayRangeRef.current;
                const candleCount = calculateCandleCount(currentTF, currentDR);
                console.log(`[useTokenDashboard] Post-event (error path): Requesting ${candleCount} candles for ${currentTF} / ${currentDR} via WebSocket.`);
                requestWsData(currentTF, candleCount);
              });
            } else {
              console.error(
                "[useTokenDashboard] Failed to decode event args:",
                log
              );
            }
          } else {
            console.error(
              "[useTokenDashboard] Log missing data or topics:",
              log
            );
          }
        } catch (e) {
          console.error(
            "[useTokenDashboard] Error processing TradeActivity event:",
            e,
            log
          );
        }
      });
    },
    onError(error) {
      // Improved error handling - don't log filter errors as they're expected with Infura
      const errorMessage = error.message || error.toString();
      if (errorMessage.includes('filter') || errorMessage.includes('resource not found')) {
        // These are common with Infura and not critical errors
        console.warn("[useTokenDashboard] Filter/resource error (non-critical):", errorMessage);
      } else {
        console.error("[useTokenDashboard] Event watching error:", error);
      }
    },
  });

  // Handlers for buy amount changes
  const handleBuyAmountChange = async (amount: string) => {
    setBuyState((prev) => ({ ...prev, amount }));

    if (
      !publicClient ||
      !bondingCurveAddress ||
      !amount ||
      isNaN(Number(amount))
    ) {
      setBuyState((prev) => ({ ...prev, estimatedCost: "0" }));
      return;
    }

    try {
      // Convert to wei for calculation
      const tokenAmountWei = amount;
      const cost = await calculatePrice(
        publicClient,
        bondingCurveAddress,
        parseEther(tokenAmountWei)
      );
      setBuyState((prev) => ({ ...prev, estimatedCost: formatEther(cost) }));
    } catch (err) {
      console.error("[useTokenDashboard] Error calculating buy price:", err);
      setBuyState((prev) => ({ ...prev, estimatedCost: "Error" }));
    }
  };

  // Handlers for sell amount changes
  const handleSellAmountChange = async (amount: string) => {
    setSellState((prev) => ({ ...prev, amount }));

    if (
      !publicClient ||
      !bondingCurveAddress ||
      !amount ||
      isNaN(Number(amount))
    ) {
      setSellState((prev) => ({ ...prev, estimatedCost: "0" }));
      return;
    }

    try {
      // Convert to wei for calculation
      const tokenAmountWei = amount;
      const payout = await getSellPayoutEstimate(
        publicClient,
        bondingCurveAddress,
        parseEther(tokenAmountWei)
      );
      setSellState((prev) => ({ ...prev, estimatedCost: formatEther(payout) }));
    } catch (err) {
      console.error("[useTokenDashboard] Error calculating sell payout:", err);
      setSellState((prev) => ({ ...prev, estimatedCost: "Error" }));
    }
  };

  // Approve tokens for buying (approve Cordex token)
  const approveBuy = async () => {
    // Add checks for publicClient and writeContractAsync
    if (
      !publicClient ||
      !bondingCurveInfo.cordexTokenAddress ||
      !bondingCurveAddress ||
      !writeContractAsync
    ) {
      console.error(
        "[useTokenDashboard] Missing required data for approve buy."
      );
      return;
    }

    setBuyState((prev) => ({ ...prev, isApproving: true }));
    setError(null);
    setSuccessInfo(null);
    try {
      const receipt = await approveTokens(
        publicClient,
        writeContractAsync,
        bondingCurveInfo.cordexTokenAddress!,
        bondingCurveAddress!,
        maxUint256
      );

      if (receipt && receipt.status === "success") {
        console.log(
          "[useTokenDashboard] Approve transaction confirmed:",
          receipt
        );
        setBuyState((prev) => ({ ...prev, hasAllowance: true }));
        
        // Store approval in localStorage to persist across sessions
        if (bondingCurveInfo.cordexTokenAddress && bondingCurveAddress && walletAddress) {
          localStorage.setItem(
            `buyAllowance-${bondingCurveInfo.cordexTokenAddress}-${walletAddress}-${bondingCurveAddress}`,
            'true'
          );
        }
        
        // Cache refresh functionality removed (not implemented)
        
        setSuccessInfo({
          message: "cordex approved successfully!",
          txHash: receipt.transactionHash,
        });
      } else {
        console.error(
          "[useTokenDashboard] Approve transaction failed or receipt not received/failed.",
          receipt
        );
        setError("failed to approve cordex tokens");
        setSuccessInfo(null);
      }
    } catch (err) {
      console.error("[useTokenDashboard] Error approving Cordex tokens:", err);
      
      // Parse the error to provide better user feedback
      const walletError = parseWalletError(err);
      
      if (walletError.isUserRejection) {
        console.log('User cancelled approval:', walletError.message);
        // For cancellations, don't set persistent error - just log it
        setError(null);
      } else {
        setError(walletError.message);
      }
      
      setSuccessInfo(null);
    } finally {
      setBuyState((prev) => ({ ...prev, isApproving: false }));
    }
  };

  // Approve tokens for selling (approve provider token)
  const approveSell = async () => {
    // Add checks for publicClient and writeContractAsync
    if (
      !publicClient ||
      !tokenInfo.address ||
      !bondingCurveAddress ||
      !writeContractAsync
    ) {
      console.error(
        "[useTokenDashboard] Missing required data for approve sell."
      );
      return;
    }

    setSellState((prev) => ({ ...prev, isApproving: true }));
    setError(null);
    setSuccessInfo(null);
    try {
      const receipt = await approveTokens(
        publicClient,
        writeContractAsync,
        tokenInfo.address!,
        bondingCurveAddress!,
        maxUint256
      );

      if (receipt && receipt.status === "success") {
        console.log(
          "[useTokenDashboard] Approve transaction confirmed:",
          receipt
        );
        setSellState((prev) => ({ ...prev, hasAllowance: true }));
        
        // Store approval in localStorage to persist across sessions
        if (tokenInfo.address && bondingCurveAddress && walletAddress) {
          localStorage.setItem(
            `sellAllowance-${tokenInfo.address}-${walletAddress}-${bondingCurveAddress}`,
            'true'
          );
        }
        
        // Cache refresh functionality removed (not implemented)
        
        setSuccessInfo({
          message: `${
            tokenInfo.symbol?.toLowerCase() || "tokens"
          } approved successfully!`,
          txHash: receipt.transactionHash,
        });
      } else {
        console.error(
          "[useTokenDashboard] Approve transaction failed or receipt not received/failed.",
          receipt
        );
        setError("failed to approve provider tokens");
        setSuccessInfo(null);
      }
    } catch (err) {
      console.error(
        "[useTokenDashboard] Error approving provider tokens:",
        err
      );
      
      // Parse the error to provide better user feedback
      const walletError = parseWalletError(err);
      
      if (walletError.isUserRejection) {
        console.log('User cancelled approval:', walletError.message);
        // For cancellations, don't set persistent error - just log it
        setError(null);
      } else {
        setError(walletError.message);
      }
      
      setSuccessInfo(null);
    } finally {
      setSellState((prev) => ({ ...prev, isApproving: false }));
    }
  };

  // Execute buy transaction
  const executeBuy = async () => {
    if (
      !publicClient ||
      !bondingCurveAddress ||
      !buyState.amount ||
      !writeContractAsync
    ) {
      console.error(
        "[useTokenDashboard] Missing required data for buy execution."
      );
      return;
    }

    setBuyState((prev) => ({ ...prev, isProcessing: true }));
    setError(null);
    setSuccessInfo(null);
    try {
      const tokenAmountWei = buyState.amount;
      const receipt = await buyTokens(
        publicClient,
        writeContractAsync,
        bondingCurveAddress!,
        parseEther(tokenAmountWei)
      );

      if (receipt && receipt.status === "success") {
        console.log("[useTokenDashboard] Buy transaction confirmed:", receipt);
        const boughtAmount = buyState.amount;
        setBuyState((prev) => ({
          ...prev,
          amount: "",
          estimatedCost: "0",
        }));
        
        setSuccessInfo({
          message: `successfully bought ${boughtAmount} ${
            tokenInfo.symbol?.toLowerCase() || "tokens"
          }!`,
          txHash: receipt.transactionHash,
        });
        
        // Immediate cache refresh and data update (no delays)
        console.log("[useTokenDashboard] Starting immediate post-trade refresh...");
        
        // Parallel execution for maximum speed
        const refreshPromises = [
          refreshServerCache(),
          refreshBondingCurveInfo(),
          refreshTokenBalance(),
          refreshCordexBalance()
        ];
        
        // Execute all refreshes in parallel
        Promise.all(refreshPromises).then(() => {
          console.log("[useTokenDashboard] All post-trade refreshes completed");
          
          // Invalidate all chart caches and fetch fresh data immediately
          invalidateAllChartCaches();
          const currentTF = chartTimeframeRef.current;
          const currentDR = chartDisplayRangeRef.current;
          const candleCount = calculateCandleCount(currentTF, currentDR);
          console.log(`[useTokenDashboard] Post-buy: Requesting ${candleCount} candles for ${currentTF} / ${currentDR} via WebSocket.`);
          requestWsData(currentTF, candleCount); 
        }).catch(error => {
          console.error("[useTokenDashboard] Error in post-trade refresh:", error);
          // Still try to fetch fresh chart data even if other refreshes fail
          invalidateAllChartCaches();
          const currentTF = chartTimeframeRef.current;
          const currentDR = chartDisplayRangeRef.current;
          const candleCount = calculateCandleCount(currentTF, currentDR);
          console.log(`[useTokenDashboard] Post-buy (error path): Requesting ${candleCount} candles for ${currentTF} / ${currentDR} via WebSocket.`);
          requestWsData(currentTF, candleCount);
        });
      } else {
        console.error(
          "[useTokenDashboard] Buy transaction failed or receipt not received/failed.",
          receipt
        );
        setError("buy transaction failed or confirmation timed out.");
        setSuccessInfo(null);
      }
    } catch (err) {
      console.error("[useTokenDashboard] Error buying tokens:", err);
      
      // Parse the error to provide better user feedback
      const walletError = parseWalletError(err);
      
      if (walletError.isUserRejection) {
        console.log('User cancelled buy transaction:', walletError.message);
        // For cancellations, don't set persistent error - just log it
        setError(null);
      } else {
        setError(walletError.message);
      }
      
      setSuccessInfo(null);
    } finally {
      setBuyState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Execute sell transaction
  const executeSell = async () => {
    if (
      !publicClient ||
      !bondingCurveAddress ||
      !sellState.amount ||
      !writeContractAsync
    ) {
      console.error(
        "[useTokenDashboard] Missing required data for sell execution."
      );
      return;
    }

    setSellState((prev) => ({ ...prev, isProcessing: true }));
    setError(null);
    setSuccessInfo(null);

    try {
      const tokenAmountWei = sellState.amount;
      const receipt = await sellTokens(
        publicClient,
        writeContractAsync,
        bondingCurveAddress!,
        parseEther(tokenAmountWei)
      );

      if (receipt && receipt.status === "success") {
        console.log("[useTokenDashboard] Sell transaction confirmed:", receipt);
        const soldAmount = sellState.amount;
        setSellState((prev) => ({
          ...prev,
          amount: "",
          estimatedCost: "0",
        }));
        
        setSuccessInfo({
          message: `successfully sold ${soldAmount} ${
            tokenInfo.symbol?.toLowerCase() || "tokens"
          }!`,
          txHash: receipt.transactionHash,
        });
        
        // Immediate cache refresh and data update (no delays)
        console.log("[useTokenDashboard] Starting immediate post-trade refresh...");
        
        // Parallel execution for maximum speed
        const refreshPromises = [
          refreshServerCache(),
          refreshBondingCurveInfo(),
          refreshTokenBalance(),
          refreshCordexBalance()
        ];
        
        // Execute all refreshes in parallel
        Promise.all(refreshPromises).then(() => {
          console.log("[useTokenDashboard] All post-trade refreshes completed");
          
          // Invalidate all chart caches and fetch fresh data immediately
          invalidateAllChartCaches();
          const currentTF = chartTimeframeRef.current;
          const currentDR = chartDisplayRangeRef.current;
          const candleCount = calculateCandleCount(currentTF, currentDR);
          console.log(`[useTokenDashboard] Post-sell: Requesting ${candleCount} candles for ${currentTF} / ${currentDR} via WebSocket.`);
          requestWsData(currentTF, candleCount); 
        }).catch(error => {
          console.error("[useTokenDashboard] Error in post-trade refresh:", error);
          // Still try to fetch fresh chart data even if other refreshes fail
          invalidateAllChartCaches();
          const currentTF = chartTimeframeRef.current;
          const currentDR = chartDisplayRangeRef.current;
          const candleCount = calculateCandleCount(currentTF, currentDR);
          console.log(`[useTokenDashboard] Post-sell (error path): Requesting ${candleCount} candles for ${currentTF} / ${currentDR} via WebSocket.`);
          requestWsData(currentTF, candleCount);
        });
      } else {
        console.error(
          "[useTokenDashboard] Sell transaction failed or receipt not received/failed.",
          receipt
        );
        setError("sell transaction failed or confirmation timed out.");
        setSuccessInfo(null);
      }
    } catch (err) {
      console.error("[useTokenDashboard] Error selling tokens:", err);
      
      // Parse the error to provide better user feedback
      const walletError = parseWalletError(err);
      
      if (walletError.isUserRejection) {
        console.log('User cancelled sell transaction:', walletError.message);
        // For cancellations, don't set persistent error - just log it
        setError(null);
      } else {
        setError(walletError.message);
      }
      
      setSuccessInfo(null);
    } finally {
      setSellState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  return {
    ownerAddress,
    bondingCurveAddress,
    tokenInfo,
    bondingCurveInfo,
    buyState,
    sellState,
    isLoading,
    error,
    successInfo,
    blockExplorerUrl,
    chartData,
    chartTimeframe,
    availableTimeframes,
    activeTab,
    setActiveTab,
    handleBuyAmountChange,
    handleSellAmountChange,
    approveBuy,
    approveSell,
    executeBuy,
    executeSell,
    refreshBondingCurveInfo,
    handleTimeframeChange,
    clearSuccessMessage,
    clearErrorMessage,
    calculateMaxBuyableAmount,
    refreshServerCache,
    // New chart display range properties
    chartDisplayRange,
    availableDisplayRanges,
    handleDisplayRangeChange,
    // WebSocket specific
    wsConnected,
    wsError,
    reconnectWs,
    lastTradeData
  };
}
