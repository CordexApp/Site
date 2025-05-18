"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

// --- Constants & ABIs ---

// Factory contract address
const factoryAddressEnv = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
if (!factoryAddressEnv) {
  throw new Error(
    "NEXT_PUBLIC_FACTORY_ADDRESS environment variable is not set."
  );
}
export const factoryAddress = factoryAddressEnv as `0x${string}`;

// Factory ABI (partial)
const factoryAbi = [
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderContracts",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderTokens",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getBondingCurveContracts",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Token ABI (partial)
const tokenAbi = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Bonding Curve ABI (partial)
const bondingCurveAbi = [
  {
    inputs: [],
    name: "providerTokenAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accumulatedFees",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenSupply", // Using balanceOf on the token contract instead
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// --- Types ---

export interface ProviderToken {
  address: `0x${string}`;
  name: string;
  symbol: string;
  balance: string; // Formatted balance
}

export interface BondingCurve {
  address: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  accumulatedFees: string; // Formatted fees
  tokenSupply: string; // Formatted supply (token balance of the curve)
}

export type ActionStatus = "idle" | "executing" | "success" | "error";

// Use the original name consistently
export interface UseMyContractsReturn {
  isLoading: boolean;
  providerTokens: ProviderToken[];
  bondingCurves: BondingCurve[];
  selectedCurve: `0x${string}` | null;
  setSelectedCurve: (address: `0x${string}` | null) => void;
  actionStatus: ActionStatus;
  errorMessage: string;
  successMessage: string;
  txHash: `0x${string}` | undefined;
  isPending: boolean; // from useWriteContract
  isWaitingForReceipt: boolean; // from useWaitForTransactionReceipt
  withdrawFees: (curveAddress: `0x${string}`) => void;
  refreshData: () => void;
  isConnected: boolean;
}

// --- Hook Implementation ---

export default function useMyContracts(): UseMyContractsReturn {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [providerTokens, setProviderTokens] = useState<ProviderToken[]>([]);
  const [bondingCurves, setBondingCurves] = useState<BondingCurve[]>([]);
  const [selectedCurve, setSelectedCurve] = useState<`0x${string}` | null>(
    null
  );
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Internal state for refetching
  const [refetchCounter, setRefetchCounter] = useState(0);
  const refreshData = useCallback(() => {
    setActionStatus("idle");
    setErrorMessage("");
    setSuccessMessage("");
    setTxHash(undefined);
    setSelectedCurve(null);
    setRefetchCounter((prev) => prev + 1);
  }, []);

  // Fetch initial contract/token lists from factory
  const {
    data: factoryData,
    error: factoryError,
    refetch: refetchFactoryData,
  } = useReadContracts({
    allowFailure: true,
    contracts: [
      {
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "getProviderTokens",
        args: address ? [address] : undefined,
      },
      {
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "getBondingCurveContracts",
        args: address ? [address] : undefined,
      },
    ],
    query: {
      enabled: !!address && isConnected,
      refetchOnWindowFocus: false,
    },
  });

  const tokenAddresses = factoryData?.[0]?.result as
    | `0x${string}`[]
    | undefined;
  const curveAddresses = factoryData?.[1]?.result as
    | `0x${string}`[]
    | undefined;

  // Fetch details for tokens
  const tokenContracts =
    tokenAddresses?.flatMap((tokenAddr) => [
      {
        address: tokenAddr,
        abi: tokenAbi,
        functionName: "name",
      },
      {
        address: tokenAddr,
        abi: tokenAbi,
        functionName: "symbol",
      },
      {
        address: tokenAddr,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: address ? [address] : [], // Ensure address is defined
      },
    ]) ?? [];

  const {
    data: tokenDetailsData,
    error: tokenDetailsError,
    isLoading: isLoadingTokens,
    refetch: refetchTokenDetails,
  } = useReadContracts({
    allowFailure: true,
    contracts: tokenContracts,
    query: {
      enabled: !!tokenAddresses && tokenAddresses.length > 0 && !!address,
      refetchOnWindowFocus: false,
    },
  });

  // Process token details
  useEffect(() => {
    if (
      tokenDetailsData &&
      tokenAddresses &&
      tokenDetailsData.length === tokenAddresses.length * 3
    ) {
      const tokens: ProviderToken[] = [];
      for (let i = 0; i < tokenAddresses.length; i++) {
        const baseIndex = i * 3;
        const name =
          (tokenDetailsData[baseIndex]?.result as string | undefined) ??
          "Unknown Token";
        const symbol =
          (tokenDetailsData[baseIndex + 1]?.result as string | undefined) ??
          "???";
        const balance =
          (tokenDetailsData[baseIndex + 2]?.result as bigint | undefined) ??
          BigInt(0);
        tokens.push({
          address: tokenAddresses[i],
          name: name,
          symbol: symbol,
          balance: formatEther(balance),
        });
      }
      setProviderTokens(tokens);
    } else if (tokenAddresses && !isLoadingTokens) {
      // Handle case where data isn't fully loaded or error occurred
      setProviderTokens([]);
    }
  }, [tokenDetailsData, tokenAddresses, isLoadingTokens]);

  // --- Fetch details for Bonding Curves (more complex due to nested calls) ---
  const [curveDetailsInternal, setCurveDetailsInternal] = useState<any[]>([]);
  const [isLoadingCurves, setIsLoadingCurves] = useState(false);

  useEffect(() => {
    const fetchCurveDetails = async () => {
      if (
        !curveAddresses ||
        curveAddresses.length === 0 ||
        !isConnected ||
        !address ||
        !publicClient
      ) {
        setBondingCurves([]);
        setIsLoadingCurves(false);
        return;
      }
      setIsLoadingCurves(true);

      try {
        // 1. Get tokenAddress and fees for all curves
        const primaryDetailsPromises = curveAddresses.map((curveAddr) =>
          publicClient
            .readContract({
              address: curveAddr,
              abi: bondingCurveAbi,
              functionName: "providerTokenAddress",
            })
            .then((tokenAddress) =>
              publicClient
                .readContract({
                  address: curveAddr,
                  abi: bondingCurveAbi,
                  functionName: "accumulatedFees",
                })
                .then((fees) => ({
                  curveAddress: curveAddr,
                  tokenAddress,
                  fees: (fees as bigint | undefined) ?? BigInt(0),
                }))
            )
        );
        const primaryDetails = await Promise.all(primaryDetailsPromises);

        // 2. Get token details (name, symbol) and curve's token balance for each curve
        const tokenInfoPromises = primaryDetails.map(
          async ({ curveAddress, tokenAddress, fees }) => {
            if (
              !tokenAddress ||
              tokenAddress === "0x0000000000000000000000000000000000000000"
            ) {
              return {
                address: curveAddress,
                tokenAddress: "0x0" as `0x${string}`,
                tokenName: "Invalid Token Address",
                tokenSymbol: "ERR",
                accumulatedFees: formatEther(fees || BigInt(0)),
                tokenSupply: "0",
              };
            }
            try {
              const [name, symbol, supply] = await Promise.all([
                publicClient.readContract({
                  address: tokenAddress,
                  abi: tokenAbi,
                  functionName: "name",
                }),
                publicClient.readContract({
                  address: tokenAddress,
                  abi: tokenAbi,
                  functionName: "symbol",
                }),
                publicClient.readContract({
                  address: tokenAddress,
                  abi: tokenAbi,
                  functionName: "balanceOf",
                  args: [curveAddress],
                }),
              ]);
              return {
                address: curveAddress,
                tokenAddress: tokenAddress as `0x${string}`,
                tokenName: (name as string) || "Unknown Token",
                tokenSymbol: (symbol as string) || "???",
                accumulatedFees: formatEther(fees || BigInt(0)),
                tokenSupply: formatEther((supply as bigint) || BigInt(0)),
              };
            } catch (tokenError) {
              console.error(
                `Error fetching details for token ${tokenAddress} of curve ${curveAddress}:`,
                tokenError
              );
              return {
                address: curveAddress,
                tokenAddress: tokenAddress as `0x${string}`,
                tokenName: "Error Loading Name",
                tokenSymbol: "ERR",
                accumulatedFees: formatEther(fees || BigInt(0)),
                tokenSupply: "Error",
              };
            }
          }
        );

        const finalCurveDetails = await Promise.all(tokenInfoPromises);
        setBondingCurves(finalCurveDetails);
      } catch (error) {
        console.error("Error fetching bonding curve details:", error);
        setBondingCurves([]);
        setErrorMessage("Failed to load bonding curve details.");
      } finally {
        setIsLoadingCurves(false);
      }
    };

    fetchCurveDetails();
    // Dependency array includes things that trigger a refetch
  }, [curveAddresses, address, isConnected, refetchCounter, publicClient]);

  // Update overall loading state
  useEffect(() => {
    // Considered loading if factory data is loading, or token/curve details are loading
    const isFactoryLoading = !factoryData && !factoryError && isConnected;
    const curvesAreLoading = isLoadingCurves && !!publicClient;
    setIsLoading(isFactoryLoading || isLoadingTokens || curvesAreLoading);

    if (factoryError) {
      console.error("Factory read error:", factoryError);
      setErrorMessage("Error fetching initial contract lists.");
      setProviderTokens([]);
      setBondingCurves([]);
      setIsLoading(false);
    }
    if (tokenDetailsError) {
      console.error("Token details read error:", tokenDetailsError);
      setErrorMessage("Error fetching token details.");
      // Don't necessarily clear everything, maybe just tokens
      setProviderTokens([]);
      // Potentially keep loading if curves might still load
    }
    if (!publicClient && isConnected && !isFactoryLoading && !isLoadingTokens) {
      setIsLoading(true); // Still loading if publicClient isn't ready but we are connected
      setErrorMessage("Connecting to blockchain provider...");
    } else if (
      publicClient &&
      errorMessage === "Connecting to blockchain provider..."
    ) {
      setErrorMessage(""); // Clear connection message once client is ready
    }
  }, [
    factoryData,
    factoryError,
    isLoadingTokens,
    isLoadingCurves,
    tokenDetailsError,
    isConnected,
    publicClient,
    errorMessage,
  ]);

  // Write contract hook for actions (withdrawFees)
  const {
    writeContract,
    isPending,
    error: writeError,
    data: writeData,
    reset: resetWriteContract, // Use reset to clear state
  } = useWriteContract();

  // Update txHash when writeData changes
  useEffect(() => {
    if (writeData) {
      console.log("Transaction submitted hash:", writeData);
      setTxHash(writeData);
    }
  }, [writeData]);

  // Wait for transaction receipt
  const {
    data: receipt,
    isLoading: isWaitingForReceipt,
    isSuccess: isTxSuccess,
    isError: isTxError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash,
    },
  });

  // Process transaction result
  useEffect(() => {
    if (!txHash || actionStatus !== "executing") return; // Only process if we triggered it

    if (isTxSuccess && receipt) {
      console.log("Transaction successful:", receipt);
      setActionStatus("success");
      setSuccessMessage("Transaction successful!"); // Generic message, refine in specific actions
      setErrorMessage("");

      // Automatically trigger a refresh after success
      refreshData(); // This will reset state including txHash via setRefetchCounter
      resetWriteContract(); // Reset write hook state

      // Keep success message for a bit, but avoid comparing to the current actionStatus
      const timer = setTimeout(() => {
        // Simply set to idle after timeout, regardless of current state
        setActionStatus("idle");
      }, 3000);
      return () => clearTimeout(timer);
    } else if (isTxError) {
      console.error("Transaction failed:", receipt);
      setActionStatus("error");
      setErrorMessage(
        `Transaction failed. Status: ${
          receipt?.status ?? "unknown"
        }. Check console or Etherscan.`
      );
      setSuccessMessage("");
      resetWriteContract(); // Reset write hook state
      // No auto-reset for error, user needs to dismiss
    }
  }, [
    isTxSuccess,
    isTxError,
    receipt,
    txHash,
    actionStatus,
    refreshData,
    resetWriteContract,
  ]);

  // Handle write errors (e.g., user rejection, gas issues before submission)
  useEffect(() => {
    if (writeError && actionStatus === "executing") {
      console.error("Write contract error:", writeError);
      setActionStatus("error");
      const message =
        writeError instanceof Error ? writeError.message : String(writeError);
      // Try to extract a useful message
      let displayMsg = `Error: ${message}`;
      if (message.includes("rejected") || message.includes("denied")) {
        displayMsg = "Transaction rejected by user.";
      } else if (message.includes("insufficient funds")) {
        displayMsg = "Error: Insufficient funds for transaction.";
      } else if (message.includes("execution reverted")) {
        const revertReason =
          message.split("execution reverted")[1]?.split('"')[1] ||
          "Contract execution failed";
        displayMsg = `Error: ${revertReason}`;
      }
      setErrorMessage(displayMsg);
      setSuccessMessage("");
      setTxHash(undefined); // Clear hash if submission failed
      resetWriteContract();
      // No auto-reset for error
    }
  }, [writeError, actionStatus, resetWriteContract]);

  // Withdraw fees action
  const withdrawFees = useCallback(
    (curveAddress: `0x${string}`) => {
      if (!isConnected) {
        setErrorMessage("Please connect your wallet.");
        return;
      }
      setActionStatus("executing");
      setErrorMessage("");
      setSuccessMessage("");
      setTxHash(undefined); // Clear previous hash
      resetWriteContract(); // Reset before new call

      // Find the curve to check if fees > 0 (optional)
      const curve = bondingCurves.find((c) => c.address === curveAddress);
      if (curve && parseFloat(curve.accumulatedFees) <= 0) {
        // Optionally prevent tx if fees are 0
        // setActionStatus("idle");
        // setErrorMessage("No fees to withdraw.");
        // return;
        console.warn("Attempting to withdraw 0 fees.");
      }

      writeContract({
        address: curveAddress,
        abi: bondingCurveAbi,
        functionName: "withdrawFees",
        args: [],
      });
    },
    [isConnected, writeContract, resetWriteContract, bondingCurves]
  );

  // Redirect if not connected after initial load check
  useEffect(() => {
    // Give it a moment to check connection status before redirecting
    const timer = setTimeout(() => {
      if (!isLoading && !isConnected) {
        console.log("Not connected, redirecting...");
        router.push("/"); // Redirect to home or connect page
      }
    }, 500); // Small delay
    return () => clearTimeout(timer);
  }, [isConnected, isLoading, router]);

  return {
    isLoading,
    providerTokens,
    bondingCurves,
    selectedCurve,
    setSelectedCurve,
    actionStatus,
    errorMessage,
    successMessage,
    txHash,
    isPending, // Exporting direct status from wagmi hooks
    isWaitingForReceipt,
    withdrawFees,
    refreshData,
    isConnected, // Pass connection status
  };
}
