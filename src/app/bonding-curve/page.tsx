"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { formatEther, maxUint256 } from "viem";
import {
    useAccount,
    useReadContract,
    useTransaction,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";

export default function BondingCurveDeploy() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  
  // Get provider token address from URL query parameters
  const providerTokenAddress = searchParams.get("tokenAddress");

  // Form state
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [tokenName, setTokenName] = useState<string>("");
  const [hasAllowance, setHasAllowance] = useState(false);
  
  // Fixed curve parameters
  const slope = "1000000000000"; // 0.000001 * 10^18
  const intercept = "10000000000000000"; // 0.01 * 10^18

  // Transaction status
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>(); // Hash currently being watched
  const [deploymentTxHash, setDeploymentTxHash] = useState<`0x${string}` | undefined>(); // Specific hash of the deployment tx
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "pending" | "approving" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ContractFactory deployed address
  const contractConfig = {
    address: "0xe68f605a83ca55e78e51ce3f46aea37c0454461c" as `0x${string}`,
    abi: [
      {
        inputs: [
          { name: "providerTokenAddress", type: "address" },
          { name: "initialTokenAmount", type: "uint256" },
          { name: "slope", type: "uint256" },
          { name: "intercept", type: "uint256" },
        ],
        name: "deployBondingCurveContract",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as const,
  };

  // Provider token ABI (partial, only for allowance/approval)
  const tokenAbi = [
    {
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
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
      inputs: [],
      name: "name",
      outputs: [{ name: "", type: "string" }],
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

  // Read contract hooks
  const { data: balanceData } = useReadContract({
    address: providerTokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!providerTokenAddress && !!address
    }
  });

  const { data: symbolData } = useReadContract({
    address: providerTokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "symbol",
    query: {
      enabled: !!providerTokenAddress
    }
  });

  const { data: nameData } = useReadContract({
    address: providerTokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "name",
    query: {
      enabled: !!providerTokenAddress
    }
  });

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: providerTokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "allowance",
    args: address && contractConfig.address ? 
      [address as `0x${string}`, contractConfig.address] : 
      undefined,
    query: {
      enabled: !!providerTokenAddress && !!address
    }
  });

  // Write contract hook
  const {
    writeContract,
    isPending,
    error,
    data: writeData,
  } = useWriteContract();

  // Update token data when it's available
  useEffect(() => {
    if (balanceData) {
      setTokenBalance(formatEther(balanceData as bigint));
    }
    if (symbolData) {
      setTokenSymbol(symbolData as string);
    }
    if (nameData) {
      setTokenName(nameData as string);
    }
  }, [balanceData, symbolData, nameData]);

  // Update allowance check based on fetched allowanceData
  useEffect(() => {
    if (allowanceData !== undefined) {
      setHasAllowance((allowanceData as bigint) > BigInt(0));
    }
  }, [allowanceData]);

  // Update currentTxHash and potentially deploymentTxHash when writeData is available
  useEffect(() => {
    if (writeData) {
      console.log("Contract write initiated, txHash:", writeData);
      setCurrentTxHash(writeData); // Update the hash being watched

      // If the status was 'pending', this was a deployment attempt
      if (deploymentStatus === 'pending') {
        setDeploymentTxHash(writeData);
      } 
      // If the status was 'approving', this was an approval attempt
      else if (deploymentStatus === 'approving') {
        setDeploymentTxHash(undefined); // Ensure deployment hash is cleared on approval
      }
    }
  }, [writeData, deploymentStatus]); // Add deploymentStatus dependency

  // Handle errors from writeContract
  useEffect(() => {
    if (error) {
      console.error("Contract write error:", error);
      setDeploymentStatus("error");
      setErrorMessage(error.message || "Transaction failed");
    }
  }, [error]);

  // Transaction status monitoring
  const {
    data: txData,
    isSuccess,
    isError,
  } = useTransaction({
    hash: currentTxHash, // Watch the current hash
  });

  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } = 
    useWaitForTransactionReceipt({
      hash: currentTxHash, // Wait for the current hash
    });

  // Process transaction receipt when available
  useEffect(() => {
    // Only proceed if we have a receipt and the status was 'pending' or 'approving'
    if (receipt && (deploymentStatus === "pending" || deploymentStatus === "approving")) {
      console.log(`Transaction receipt received (${deploymentStatus}):`, receipt);

      if (receipt.status === "success") {
        // Handle successful APPROVAL transaction
        if (deploymentStatus === "approving") {
          console.log("Approval transaction successful.");
          setDeploymentStatus("idle"); 
          refetchAllowance(); 
          // Optional: Clear current hash? Maybe not needed as next action will set it.
          // setCurrentTxHash(undefined); 
          return; 
        }
        
        // Handle successful DEPLOYMENT transaction
        // Crucially, check if the receipt hash matches the expected deployment hash
        if (deploymentStatus === "pending" && receipt.transactionHash === deploymentTxHash) {
          console.log("Deployment transaction successful.");
          setDeploymentStatus("success"); // Set final success state ONLY for matching deployment tx
        } else if (deploymentStatus === "pending") {
           // This case should ideally not happen if state logic is correct, but good for debugging
           console.warn("Received success receipt while status was 'pending', but hash doesn't match expected deployment hash.", 
             { receiptHash: receipt.transactionHash, expectedHash: deploymentTxHash });
        }

      } else {
        // Handle transaction failure (reverted)
        console.error("Transaction reverted:", receipt);
        setDeploymentStatus("error");
        setErrorMessage(`Transaction reverted: ${receipt.transactionHash}`);
      }
    }
    // Added deploymentTxHash to dependencies
  }, [receipt, deploymentStatus, deploymentTxHash, refetchAllowance]); 

  // Function to approve token spending
  const approveTokens = () => {
    if (!providerTokenAddress) return;
    
    setDeploymentStatus("approving");
    setErrorMessage("");
    
    writeContract({
      address: providerTokenAddress as `0x${string}`,
      abi: tokenAbi,
      functionName: "approve",
      args: [contractConfig.address, maxUint256], // Approve max uint256
    });
  };

  // Function to deploy bonding curve
  const deployBondingCurve = () => {
    // Use the fetched allowance as the initial token amount
    const approvedAmount = allowanceData as bigint | undefined;
    if (!providerTokenAddress || !approvedAmount || approvedAmount === BigInt(0)) {
        setErrorMessage("No approved amount found or amount is zero.");
        setDeploymentStatus("error");
        return;
    }
    
    setDeploymentStatus("pending");
    setErrorMessage("");
    
    writeContract({
      ...contractConfig,
      functionName: "deployBondingCurveContract",
      args: [
        providerTokenAddress as `0x${string}`,
        approvedAmount, // Use the approved amount
        BigInt(slope), // Use fixed slope
        BigInt(intercept), // Use fixed intercept
      ],
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!providerTokenAddress) {
      setErrorMessage("Provider token address is missing.");
      return;
    }

    // Refetch allowance before deciding action
    refetchAllowance();

    const currentAllowance = allowanceData as bigint | undefined;

    if (currentAllowance !== undefined && currentAllowance > BigInt(0)) {
      // If allowance exists and is > 0, deploy directly
      deployBondingCurve();
    } else {
      // Otherwise, approve first
      approveTokens();
    }
  };

  // Redirect if no token address
  useEffect(() => {
    if (!providerTokenAddress) {
      router.push("/launch");
    }
  }, [providerTokenAddress, router]);

  if (!providerTokenAddress) {
    return <div className="min-h-screen bg-black text-white p-8">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-12 font-mono bg-black text-white">
      <h1 className="text-3xl font-bold mb-8">create bonding curve</h1>
      
      <div className="w-full max-w-lg mb-8">
        <div className="mb-6 p-4 border border-gray-700">
          <h2 className="text-xl mb-2">token details</h2>
          <p>Name: {tokenName || "Loading..."}</p>
          <p>Symbol: {tokenSymbol || "Loading..."}</p>
          <p>Address: {providerTokenAddress}</p>
          <p>Your Balance: {tokenBalance} {tokenSymbol}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-sm mb-1">initial seed amount</p>
            <p className="w-full px-4 py-2 bg-transparent border border-gray-700 min-h-[40px] flex items-center">
              {allowanceData !== undefined ? `${formatEther(allowanceData as bigint)} ${tokenSymbol}` : "Loading approval..."}
            </p>
            <p className="text-xs mt-1">
              The bonding curve will be seeded with the full amount you approved for the factory contract.
              If you haven't approved yet or want to change the amount, click "Approve Max & Create Curve".
            </p>
          </div>

          <button
            type="submit"
            disabled={
              isPending ||
              deploymentStatus === "pending" ||
              deploymentStatus === "approving" ||
              isWaitingForReceipt
            }
            className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? "submitting..."
              : deploymentStatus === "pending"
              ? "deploying curve..."
              : deploymentStatus === "approving"
              ? "approving max..."
              : isWaitingForReceipt
              ? "confirming..."
              : hasAllowance
              ? "create bonding curve"
              : "approve max & create curve"}
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
          </button>

          {deploymentStatus === "error" && (
            <div className="text-red-500 mt-2 p-3 border border-red-500">
              <p className="font-bold">Deployment failed</p>
              <p>{errorMessage}</p>
              {currentTxHash && (
                <a
                  href={`https://sepolia-optimism.etherscan.io/tx/${currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative text-white font-medium group inline-block mt-2"
                >
                  view transaction
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
                </a>
              )}
            </div>
          )}

          {deploymentStatus === "success" && (
            <div className="text-green-500 mt-4 p-3 border border-green-500 space-y-2">
              <p className="font-bold">Bonding curve successfully created!</p>
              <p>
                Your bonding curve is now live on the blockchain. Users can now buy and sell your {tokenSymbol} tokens.
              </p>
              {(deploymentTxHash || currentTxHash) && (
                <a
                  href={`https://sepolia-optimism.etherscan.io/tx/${deploymentTxHash || currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative text-white font-medium group inline-block"
                >
                  view transaction
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
                </a>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 