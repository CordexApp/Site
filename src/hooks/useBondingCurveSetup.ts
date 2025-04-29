import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useManageService } from "@/context/ManageServiceContext";
import {
  getTokenAllowance,
  approveTokens,
  deployBondingCurveContract,
  FACTORY_ADDRESS,
} from "@/services/bondingCurveServices";
import { formatEther } from "viem";

// Simple helper to shorten addresses
export const shorten = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(addr.length - 4)}`;

export function useBondingCurveSetup() {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient();

  // Transaction state for approval
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApprovePending,
    isError: isApproveError,
    error: approveError,
  } = useWriteContract();

  // Transaction state for deployment
  const {
    writeContract: writeDeploy,
    data: deployTxHash,
    isPending: isDeployPending,
    isError: isDeployError,
    error: deployError,
  } = useWriteContract();

  // Track transaction confirmations
  const { isLoading: isApproveTxConfirming, isSuccess: isApproveTxConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
      confirmations: 1,
    });

  const { isLoading: isDeployTxConfirming, isSuccess: isDeployTxConfirmed } =
    useWaitForTransactionReceipt({
      hash: deployTxHash,
      confirmations: 1,
    });

  const {
    providerTokenAddress,
    bondingCurveAddress,
    ownerAddress,
    refreshData,
    isLoading: contextLoading,
  } = useManageService();

  // State
  const [percentage, setPercentage] = useState("50");
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if the current user is the owner
  const isOwner = ownerAddress === walletAddress;

  // Calculate values based on percentage
  const initialTokenAmount =
    (tokenBalance * BigInt(Number(percentage || "0"))) / BigInt(100);
  const allowanceEnough = allowance >= initialTokenAmount;
  const formattedBalance = formatEther(tokenBalance).split(".")[0];
  const formattedInitialAmount = formatEther(initialTokenAmount).split(".")[0];

  // Fixed parameters (18-dec scaled)
  const fixedSlope = BigInt("100000000000000"); // 0.0001 * 1e18
  const fixedIntercept = BigInt("10000000000000000"); // 0.01 * 1e18

  // Update transaction state effects
  useEffect(() => {
    // When approval is confirmed, refresh allowance
    if (
      isApproveTxConfirmed &&
      providerTokenAddress &&
      walletAddress &&
      publicClient
    ) {
      getTokenAllowance(
        publicClient,
        providerTokenAddress,
        walletAddress,
        FACTORY_ADDRESS
      ).then((newAllowance) => {
        setAllowance(newAllowance);
      });
    }
  }, [isApproveTxConfirmed, providerTokenAddress, walletAddress, publicClient]);

  useEffect(() => {
    // When deployment is confirmed, refresh context data
    if (isDeployTxConfirmed) {
      refreshData();
    }
  }, [isDeployTxConfirmed, refreshData]);

  // Load token balance when token address is available
  useEffect(() => {
    const fetchBalance = async () => {
      if (!providerTokenAddress || !walletAddress || !publicClient) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Get token balance
        const balance = await publicClient.readContract({
          address: providerTokenAddress,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [walletAddress],
        });

        setTokenBalance(BigInt(balance || 0));

        // Get token allowance
        const allowance = await getTokenAllowance(
          publicClient,
          providerTokenAddress,
          walletAddress,
          FACTORY_ADDRESS
        );

        setAllowance(allowance);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching token data:", err);
        setError("Failed to load token data");
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [providerTokenAddress, walletAddress, publicClient]);

  // Handlers
  const handleApprove = async () => {
    if (!providerTokenAddress || !walletAddress) {
      setError("Missing token address or wallet connection");
      return;
    }

    try {
      setError(null);

      // Calculate the amount needed (plus small buffer)
      const amountToApprove =
        (tokenBalance * BigInt(Number(percentage || "0"))) / BigInt(100);
      const bufferedAmount =
        amountToApprove + (amountToApprove * BigInt(5)) / BigInt(100);

      await approveTokens(
        writeApprove,
        providerTokenAddress,
        FACTORY_ADDRESS,
        bufferedAmount
      );
      // Transaction is now pending and will be tracked by the useWaitForTransactionReceipt hook
    } catch (err) {
      console.error("Error approving tokens:", err);
      setError(err instanceof Error ? err.message : "Approval failed");
    }
  };

  const handleDeploy = async () => {
    if (!providerTokenAddress || !walletAddress) {
      setError("Missing token address or wallet connection");
      return;
    }

    try {
      setError(null);

      await deployBondingCurveContract(writeDeploy, {
        providerTokenAddress,
        initialTokenAmount,
        slope: fixedSlope,
        intercept: fixedIntercept,
      });
      // Transaction is now pending and will be tracked by the useWaitForTransactionReceipt hook
    } catch (err) {
      console.error("Error deploying bonding curve:", err);
      setError(err instanceof Error ? err.message : "Deployment failed");
    }
  };

  // Processing states
  const isApproving = isApprovePending || isApproveTxConfirming;
  const isDeploying = isDeployPending || isDeployTxConfirming;
  const isProcessing = isApproving || isDeploying;

  // Use network errors if available
  useEffect(() => {
    if (approveError && isApproveError) {
      setError(approveError.message || "Approval failed");
    } else if (deployError && isDeployError) {
      setError(deployError.message || "Deployment failed");
    }
  }, [approveError, isApproveError, deployError, isDeployError]);

  return {
    // States
    percentage,
    setPercentage,
    tokenBalance,
    allowance,
    isLoading,
    error,
    contextLoading,
    isOwner,
    bondingCurveAddress,
    providerTokenAddress,

    // Computed values
    initialTokenAmount,
    allowanceEnough,
    formattedBalance,
    formattedInitialAmount,
    fixedSlope,
    fixedIntercept,

    // Transaction states
    isApproving,
    isDeploying,
    isProcessing,
    isApproveTxConfirming,
    isApproveTxConfirmed,
    isDeployTxConfirming,
    isDeployTxConfirmed,
    isDeployPending,
    isApprovePending,

    // Handlers
    handleApprove,
    handleDeploy,

    // Utilities
    shorten,
  };
}
