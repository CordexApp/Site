import { useManageService } from "@/context/ManageServiceContext";
import {
    approveTokens,
    deployBondingCurveContract,
    FACTORY_ADDRESS,
    getTokenAllowance,
} from "@/services/bondingCurveServices";
import {
    getServiceByContractAddress,
    updateService,
} from "@/services/servicesService";
import { useEffect, useState } from "react";
import { formatEther, maxUint256 } from "viem";
import {
    useAccount,
    usePublicClient,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";

// Simple helper to shorten addresses
export const shorten = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(addr.length - 4)}`;

export function useBondingCurveSetup() {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient();

  // Transaction state for approval
  const {
    writeContract: writeApprove,
    writeContractAsync: writeApproveAsync,
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
    providerContractAddress,
    refreshData,
    isLoading: contextLoading,
  } = useManageService();

  // Debug log
  console.log("[useBondingCurveSetup] bondingCurveAddress from context:", bondingCurveAddress);

  // State
  const [percentage, setPercentage] = useState("50");
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);

  // Calculate values based on percentage
  const initialTokenAmount =
    (tokenBalance * BigInt(Number(percentage || "0"))) / BigInt(100);
  const allowanceEnough = allowance >= initialTokenAmount;
  const formattedBalance = formatEther(tokenBalance).split(".")[0];
  const formattedInitialAmount = formatEther(initialTokenAmount).split(".")[0];

  // Fixed parameters (18-dec scaled)
  const fixedSlope = BigInt("100000000000000"); // 0.0001 * 1e18
  const fixedIntercept = BigInt("10000000000000000"); // 0.01 * 1e18

  // Function to update the service in the database
  const updateBondingCurveInDb = async (bondingCurveAddr: string) => {
    if (!providerContractAddress) return;

    try {
      setIsUpdatingDb(true);
      console.log(
        "Updating database with bonding curve address:",
        bondingCurveAddr
      );
      // First get the service by provider contract address
      const service = await getServiceByContractAddress(
        providerContractAddress
      );

      if (service) {
        // Update the service with the bonding curve address
        await updateService(service.id, {
          bonding_curve_address: bondingCurveAddr,
        });
        console.log(
          "Updated service with bonding curve address:",
          bondingCurveAddr
        );
      } else {
        console.error(
          "Service not found for contract address:",
          providerContractAddress
        );
      }
    } catch (err) {
      console.error("Error updating service with bonding curve address:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Monitor bonding curve address changes from context
  useEffect(() => {
    // Only attempt to update the database if:
    // 1. We have a bonding curve address from the context
    // 2. We're not currently updating the database
    // 3. We have a provider contract address
    if (bondingCurveAddress && !isUpdatingDb && providerContractAddress) {
      console.log(
        "Detected bonding curve address from context:",
        bondingCurveAddress
      );
      updateBondingCurveInDb(bondingCurveAddress);
    }
  }, [bondingCurveAddress, providerContractAddress, isUpdatingDb]);

  // When deployment transaction is confirmed, just refresh the context data
  useEffect(() => {
    if (isDeployTxConfirmed && deployTxHash && publicClient) {
      console.log("Deployment confirmed, refreshing service data...");
      refreshData();
    }
  }, [isDeployTxConfirmed, refreshData, deployTxHash, publicClient]);

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

      // Use writeApproveAsync and pass publicClient
      await approveTokens(
        publicClient,
        writeApproveAsync,
        providerTokenAddress,
        FACTORY_ADDRESS,
        maxUint256
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
  const isProcessing = isApproving || isDeploying || isUpdatingDb;

  // Use network errors if available
  useEffect(() => {
    if (approveError && isApproveError) {
      setError(approveError.message || "Approval failed");
    } else if (deployError && isDeployError) {
      setError(deployError.message || "Deployment failed");
    }
  }, [approveError, isApproveError, deployError, isDeployError]);

  return {
    error,
    contextLoading,
    bondingCurveAddress,
    providerTokenAddress,
    percentage,
    setPercentage,
    tokenBalance,
    formattedBalance,
    initialTokenAmount,
    formattedInitialAmount,
    allowanceEnough,
    isLoading,
    isApprovePending,
    isApproveTxConfirming,
    isApproveTxConfirmed,
    isDeployPending,
    isDeployTxConfirming,
    isDeployTxConfirmed,
    handleApprove,
    handleDeploy,
  };
}
