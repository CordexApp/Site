import { useState, useEffect } from "react";
import { usePublicClient, useAccount, useWriteContract } from "wagmi";
import {
  findBondingCurveForProviderToken,
  getProviderTokensForWallet,
  getCurrentPrice,
  calculatePrice,
  getTokenSupply,
  getCordexTokenAddress,
  buyTokens,
  sellTokens,
  approveTokens,
  getTokenAllowance,
} from "@/services/bondingCurveServices";
import { getContractProvider } from "@/services/contractServices";
import { formatEther, parseEther } from "viem";

interface TokenInfo {
  address: `0x${string}` | null;
  name: string | null;
  symbol: string | null;
  balance: string | null;
}

interface BondingCurveInfo {
  currentPrice: string;
  tokenSupply: string;
  cordexTokenAddress: `0x${string}` | null;
}

interface TradingState {
  amount: string;
  estimatedCost: string;
  isApproving: boolean;
  isProcessing: boolean;
  hasAllowance: boolean;
}

export function useTokenDashboard(providerContractAddress: `0x${string}`) {
  const [ownerAddress, setOwnerAddress] = useState<`0x${string}` | null>(null);
  const [bondingCurveAddress, setBondingCurveAddress] = useState<
    `0x${string}` | null
  >(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    address: null,
    name: null,
    symbol: null,
    balance: null,
  });
  const [bondingCurveInfo, setBondingCurveInfo] = useState<BondingCurveInfo>({
    currentPrice: "0",
    tokenSupply: "0",
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

  const publicClient = usePublicClient();
  const { address: walletAddress } = useAccount();
  const { writeContract, isPending: isWritePending } = useWriteContract();

  // Function to refresh bonding curve data
  const refreshBondingCurveInfo = async (
    curveAddressOverride?: `0x${string}` | null
  ) => {
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

      setBondingCurveInfo({
        currentPrice: price,
        tokenSupply: formatEther(supply),
        cordexTokenAddress: cordexAddress,
      });

      // Check allowances if wallet is connected
      if (walletAddress && cordexAddress && tokenInfo.address) {
        // Check Cordex token allowance for buying
        const cordexAllowance = await getTokenAllowance(
          publicClient,
          cordexAddress,
          walletAddress,
          curveAddress
        );
        setBuyState((prev) => ({
          ...prev,
          hasAllowance: cordexAllowance > BigInt(0),
        }));

        // Check provider token allowance for selling
        const providerTokenAllowance = await getTokenAllowance(
          publicClient,
          tokenInfo.address,
          walletAddress,
          curveAddress
        );
        setSellState((prev) => ({
          ...prev,
          hasAllowance: providerTokenAllowance > BigInt(0),
        }));
      }
    } catch (err) {
      console.error(
        "[useTokenDashboard] Error refreshing bonding curve info:",
        err
      );
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setOwnerAddress(null);
      setBondingCurveAddress(null);
      setTokenInfo({ address: null, name: null, symbol: null, balance: null });

      try {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        console.log(
          `[TokenDashboard] Fetching data for provider contract: ${providerContractAddress}`
        );

        // Step 1: Get the owner address from the provider contract
        const fetchedOwnerAddress = await getContractProvider(
          publicClient,
          providerContractAddress
        );

        if (!fetchedOwnerAddress) {
          throw new Error(
            `Failed to get contract owner for ${providerContractAddress}`
          );
        }
        setOwnerAddress(fetchedOwnerAddress);
        console.log(
          `[TokenDashboard] Found owner address: ${fetchedOwnerAddress}`
        );

        // Step 2: Get provider tokens associated with the owner from the factory
        const providerTokens = await getProviderTokensForWallet(
          publicClient,
          fetchedOwnerAddress
        );
        console.log(
          `[TokenDashboard] Found provider tokens for owner:`,
          providerTokens
        );

        if (!providerTokens || providerTokens.length === 0) {
          console.log(
            "[TokenDashboard] No provider tokens found for this owner."
          );
          // If no tokens, can't proceed to find token details or bonding curve
          setIsLoading(false);
          return;
        }

        // Select the relevant token (assuming the last one is the most recent/relevant, like in ManageServiceContext)
        const tokenAddress = providerTokens[providerTokens.length - 1];
        console.log(`[TokenDashboard] Selected token address: ${tokenAddress}`);

        // Step 3: Get token details (name, symbol, balance)
        let currentTokenInfo: TokenInfo = {
          address: tokenAddress,
          name: null,
          symbol: null,
          balance: null,
        };

        try {
          console.log(
            `[TokenDashboard] Fetching details for token: ${tokenAddress}`
          );
          const [tokenName, tokenSymbol] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress,
              abi: [
                {
                  name: "name",
                  type: "function",
                  stateMutability: "view",
                  inputs: [],
                  outputs: [{ type: "string", name: "" }],
                },
              ],
              functionName: "name",
            }) as Promise<string>,
            publicClient.readContract({
              address: tokenAddress,
              abi: [
                {
                  name: "symbol",
                  type: "function",
                  stateMutability: "view",
                  inputs: [],
                  outputs: [{ type: "string", name: "" }],
                },
              ],
              functionName: "symbol",
            }) as Promise<string>,
          ]);

          currentTokenInfo.name = tokenName || null;
          currentTokenInfo.symbol = tokenSymbol || null;
          console.log(
            `[TokenDashboard] Token details: Name=${tokenName}, Symbol=${tokenSymbol}`
          );

          if (walletAddress) {
            console.log(
              `[TokenDashboard] Fetching balance for wallet: ${walletAddress}`
            );
            const balanceBigInt = (await publicClient.readContract({
              address: tokenAddress,
              abi: [
                {
                  name: "balanceOf",
                  type: "function",
                  stateMutability: "view",
                  inputs: [{ type: "address", name: "account" }],
                  outputs: [{ type: "uint256", name: "" }],
                },
              ],
              functionName: "balanceOf",
              args: [walletAddress],
            })) as bigint;
            currentTokenInfo.balance = formatEther(balanceBigInt);
            console.log(
              `[TokenDashboard] Wallet balance: ${currentTokenInfo.balance}`
            );
          }
        } catch (err) {
          console.error("[TokenDashboard] Error fetching token details:", err);
          // Keep token address, but mark other details as failed/null
        }

        setTokenInfo(currentTokenInfo);

        // Step 4: Find the bonding curve using owner and token address
        console.log(
          `[TokenDashboard] Finding bonding curve for owner ${fetchedOwnerAddress} and token ${tokenAddress}`
        );
        const bondingCurve = await findBondingCurveForProviderToken(
          publicClient,
          fetchedOwnerAddress,
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
      const tokenAmountWei = parseEther(amount);
      const cost = await calculatePrice(
        publicClient,
        bondingCurveAddress,
        tokenAmountWei
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
      const tokenAmountWei = parseEther(amount);
      const payout = await calculatePrice(
        publicClient,
        bondingCurveAddress,
        tokenAmountWei
      );
      setSellState((prev) => ({ ...prev, estimatedCost: formatEther(payout) }));
    } catch (err) {
      console.error("[useTokenDashboard] Error calculating sell payout:", err);
      setSellState((prev) => ({ ...prev, estimatedCost: "Error" }));
    }
  };

  // Approve tokens for buying (approve Cordex token)
  const approveBuy = async () => {
    if (
      !bondingCurveInfo.cordexTokenAddress ||
      !bondingCurveAddress ||
      !writeContract
    ) {
      return;
    }

    setBuyState((prev) => ({ ...prev, isApproving: true }));
    try {
      const tx = await approveTokens(
        writeContract,
        bondingCurveInfo.cordexTokenAddress,
        bondingCurveAddress,
        parseEther("1000000") // Approve a large amount
      );

      console.log("[useTokenDashboard] Approve transaction hash:", tx);

      // After approval, update the allowance state
      setBuyState((prev) => ({ ...prev, hasAllowance: true }));
    } catch (err) {
      console.error("[useTokenDashboard] Error approving Cordex tokens:", err);
      setError("Failed to approve Cordex tokens");
    } finally {
      setBuyState((prev) => ({ ...prev, isApproving: false }));
    }
  };

  // Approve tokens for selling (approve provider token)
  const approveSell = async () => {
    if (!tokenInfo.address || !bondingCurveAddress || !writeContract) {
      return;
    }

    setSellState((prev) => ({ ...prev, isApproving: true }));
    try {
      const tx = await approveTokens(
        writeContract,
        tokenInfo.address,
        bondingCurveAddress,
        parseEther("1000000") // Approve a large amount
      );

      console.log("[useTokenDashboard] Approve transaction hash:", tx);

      // After approval, update the allowance state
      setSellState((prev) => ({ ...prev, hasAllowance: true }));
    } catch (err) {
      console.error(
        "[useTokenDashboard] Error approving provider tokens:",
        err
      );
      setError("Failed to approve provider tokens");
    } finally {
      setSellState((prev) => ({ ...prev, isApproving: false }));
    }
  };

  // Execute buy transaction
  const executeBuy = async () => {
    if (!bondingCurveAddress || !buyState.amount || !writeContract) {
      return;
    }

    setBuyState((prev) => ({ ...prev, isProcessing: true }));
    try {
      const tokenAmountWei = parseEther(buyState.amount);
      const tx = await buyTokens(
        writeContract,
        bondingCurveAddress,
        tokenAmountWei
      );

      console.log("[useTokenDashboard] Buy transaction hash:", tx);

      // Reset form after successful transaction
      setBuyState((prev) => ({
        ...prev,
        amount: "",
        estimatedCost: "0",
      }));

      // Refresh data after transaction
      setTimeout(() => {
        refreshBondingCurveInfo(bondingCurveAddress);
      }, 3000); // Small delay to allow transaction to be processed
    } catch (err) {
      console.error("[useTokenDashboard] Error buying tokens:", err);
      setError("Failed to buy tokens");
    } finally {
      setBuyState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Execute sell transaction
  const executeSell = async () => {
    if (!bondingCurveAddress || !sellState.amount || !writeContract) {
      return;
    }

    setSellState((prev) => ({ ...prev, isProcessing: true }));
    try {
      const tokenAmountWei = parseEther(sellState.amount);
      const tx = await sellTokens(
        writeContract,
        bondingCurveAddress,
        tokenAmountWei
      );

      console.log("[useTokenDashboard] Sell transaction hash:", tx);

      // Reset form after successful transaction
      setSellState((prev) => ({
        ...prev,
        amount: "",
        estimatedCost: "0",
      }));

      // Refresh data after transaction
      setTimeout(() => {
        refreshBondingCurveInfo(bondingCurveAddress);
      }, 3000); // Small delay to allow transaction to be processed
    } catch (err) {
      console.error("[useTokenDashboard] Error selling tokens:", err);
      setError("Failed to sell tokens");
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
    handleBuyAmountChange,
    handleSellAmountChange,
    approveBuy,
    approveSell,
    executeBuy,
    executeSell,
    refreshBondingCurveInfo,
  };
}
