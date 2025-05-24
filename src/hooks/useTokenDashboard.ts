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
import { getServiceByContractAddress } from "@/services/servicesService";
import {
    getAvailableTimeframes,
    getOHLCVData,
    OHLCVCandle,
} from "@/services/tradingDataService";
import { useEffect, useRef, useState } from "react";
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

// Types (Ensure these are defined or imported correctly)
export interface TokenInfo {
  address: `0x${string}` | null;
  name: string | null;
  symbol: string | null;
  balance: string | null;
  totalSupply: string | null;
}

export interface BondingCurveInfo {
  currentPrice: string;
  tokenSupply: string;
  accumulatedFees: string;
  maxSellableAmount: string;
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

  const [ownerAddress, setOwnerAddress] = useState<`0x${string}` | null>(null);
  const [bondingCurveAddress, setBondingCurveAddress] = useState<
    `0x${string}` | null
  >(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    address: null,
    name: null,
    symbol: null,
    balance: null,
    totalSupply: null,
  });
  const [bondingCurveInfo, setBondingCurveInfo] = useState<BondingCurveInfo>({
    currentPrice: "0",
    tokenSupply: "0",
    accumulatedFees: "0",
    maxSellableAmount: "0",
    cordexTokenAddress: null,
  });
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
  const [chartTimeframe, setChartTimeframe] = useState<string>("1h");
  const [availableTimeframes, setAvailableTimeframes] = useState<string[]>(
    TIMEFRAME_ORDER
  );
  
  // Add caching for chart data
  const chartDataCache = useRef<Record<string, { data: OHLCVCandle[], timestamp: number }>>({});
  const CHART_CACHE_TTL = 60000; // 60 seconds cache
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Function to fetch chart data
  const fetchChartData = async (forceRefresh = false) => {
    if (!bondingCurveAddress) return;

    try {
      // Check cache first (unless force refresh)
      const cacheKey = `${bondingCurveAddress}-${chartTimeframe}`;
      const cachedData = chartDataCache.current[cacheKey];
      
      if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp) < CHART_CACHE_TTL) {
        console.log(`[useTokenDashboard] Using cached data for ${chartTimeframe}`);
        setChartData(cachedData.data);
        return;
      }

      console.log(`[useTokenDashboard] Fetching fresh data for ${chartTimeframe}`);

      // Only fetch available timeframes if we don't have them yet or they're empty
      if (availableTimeframes.length === 0 || availableTimeframes === TIMEFRAME_ORDER) {
        const timeframes = await getAvailableTimeframes(bondingCurveAddress);
        if (timeframes.length > 0) {
          setAvailableTimeframes(timeframes);

          // If current timeframe is not available, use the first one
          if (!timeframes.includes(chartTimeframe)) {
            setChartTimeframe(timeframes[0]);
            return; // This will trigger another call with the new timeframe
          }
        }
      }

      // Fetch the OHLCV data
      const response = await getOHLCVData(
        bondingCurveAddress,
        chartTimeframe,
        1000 // Limit to 1000 candles
      );

      if (response.candles.length > 0) {
        // Cache the data
        chartDataCache.current[cacheKey] = {
          data: response.candles,
          timestamp: Date.now()
        };
        setChartData(response.candles);
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setChartData([]);
    }
  };

  // Handle timeframe change with debouncing
  const handleTimeframeChange = (timeframe: string) => {
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    setChartTimeframe(timeframe);
    
    // Check if we have cached data for this timeframe
    const cacheKey = `${bondingCurveAddress}-${timeframe}`;
    const cachedData = chartDataCache.current[cacheKey];
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CHART_CACHE_TTL) {
      console.log(`[useTokenDashboard] Instant switch to cached ${timeframe} data`);
      setChartData(cachedData.data);
    } else {
      // Debounce the API call for non-cached data
      fetchTimeoutRef.current = setTimeout(() => {
        fetchChartData(false);
      }, 100); // 100ms debounce
    }
  };

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
          // Fallback to fetching if not provided
          console.log("[useTokenDashboard] initialCoinContractAddress not provided, fetching service for it via providerContractAddress:", providerContractAddress);
          const service = await getServiceByContractAddress(providerContractAddress);
          console.log("[useTokenDashboard] Service from backend:", service);

          if (!service || !service.coin_contract_address) {
            throw new Error("Token information not available from fetched service");
          }
          tokenAddress = service.coin_contract_address as `0x${string}`;
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

  // Fetch chart data when bonding curve address or timeframe changes
  useEffect(() => {
    if (fetchChartDataEnabled && bondingCurveAddress) {
      // Clear any pending timeout when dependencies change
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchChartData(false); // Initial fetch with caching
      
      // Dynamic polling interval based on timeframe - shorter timeframes need more frequent updates
      const getPollingInterval = (timeframe: string) => {
        switch (timeframe) {
          case '1m':
            return 8000;  // 8 seconds for 1-minute charts (increased from 5s)
          case '5m':
            return 12000; // 12 seconds for 5-minute charts (increased from 8s)
          case '15m':
            return 15000; // 15 seconds for 15-minute charts (increased from 12s)
          default:
            return 20000; // 20 seconds for longer timeframes (increased from 10s)
        }
      };
      
      const intervalId = setInterval(() => {
        fetchChartData(true); // Force refresh on polling
      }, getPollingInterval(chartTimeframe));
      
      return () => {
        clearInterval(intervalId);
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
      };
    }
  }, [fetchChartDataEnabled, bondingCurveAddress, chartTimeframe]);

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

  // Add Contract Event Listener with better error handling
  useWatchContractEvent({
    address: bondingCurveAddress || undefined,
    abi: [tradeActivityEventAbi],
    eventName: "TradeActivity",
    enabled: !!bondingCurveAddress,
    // Add polling configuration to reduce filter usage
    poll: true,
    pollingInterval: 5000, // Poll every 5 seconds instead of using persistent filters
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

              // Delay chart data fetch to allow backend processing
              console.log(
                "[useTokenDashboard] Scheduling chart data refresh in 2 seconds..."
              );
              
              // Shorter delay for short timeframes where users expect faster updates
              const delay = (chartTimeframe === '1m' || chartTimeframe === '5m') ? 1000 : 2000;
              
              setTimeout(() => {
                console.log(
                  "[useTokenDashboard] Fetching delayed chart data..."
                );
                fetchChartData();
              }, delay); // Dynamic delay based on timeframe
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
      setError("failed to approve cordex tokens");
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
      setError("failed to approve provider tokens");
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
        await refreshBondingCurveInfo();
        await refreshTokenBalance();
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
      setError("failed to buy tokens");
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
        await refreshBondingCurveInfo();
        await refreshTokenBalance();
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
      setError("failed to sell tokens");
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
  };
}
