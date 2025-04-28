"use client";

import { FormEvent, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useTransaction, useWriteContract } from "wagmi";

export default function LaunchService() {
  const [serviceName, setServiceName] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [maxEscrow, setMaxEscrow] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [deploymentStatus, setDeploymentStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // ContractFactory deployed address
  const contractConfig = {
    address: "0x5d6beb7d2cdc41ab6adce15c582cba64d32dee00" as `0x${string}`,
    abi: [
      {
        inputs: [
          { name: "apiEndpoint", type: "string" },
          { name: "maxEscrow", type: "uint256" },
          { name: "tokenName", type: "string" },
          { name: "tokenSymbol", type: "string" }
        ],
        name: "deployProviderContract",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "nonpayable",
        type: "function"
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderContract",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderToken",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderContracts",
        outputs: [{ name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function"
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderTokens",
        outputs: [{ name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function"
      }
    ] as const,
  };

  // Write contract hook
  const { writeContract, isPending, error, data: writeData } = useWriteContract();

  // Update txHash when writeData is available
  useEffect(() => {
    if (writeData) {
      setTxHash(writeData);
      setDeploymentStatus("pending");
    }
  }, [writeData]);

  // Handle errors from writeContract
  useEffect(() => {
    if (error) {
      setDeploymentStatus("error");
      setErrorMessage(error.message || "Transaction failed");
    }
  }, [error]);

  // Transaction status monitoring
  const { data: txData, isSuccess, isError } = useTransaction({
    hash: txHash,
  });

  // Verify transaction outcome when transaction is confirmed
  useEffect(() => {
    // Only run this if we have a transaction hash, the transaction is successful,
    // we're in pending state, and we're not already verifying
    if (txHash && isSuccess && deploymentStatus === "pending" && !isVerifying) {
      setIsVerifying(true);
      
      // Manual check for transaction status using Etherscan API
      const checkTransactionStatus = async () => {
        try {
          // Use the direct transaction receipt approach which is more reliable
          const receiptResponse = await fetch(`https://sepolia-optimism.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`);
          const receiptData = await receiptResponse.json();
          
          console.log("Transaction receipt:", receiptData);
          
          // Check if status is 0x0 (failure) in the receipt
          if (receiptData?.result?.status === "0x0") {
            setDeploymentStatus("error");
            setErrorMessage("Transaction reverted on the blockchain");
          } else if (receiptData?.result?.status === "0x1") {
            // Status 0x1 means success
            setDeploymentStatus("success");
          } else {
            // If we can't determine the status from the receipt, try the transaction status API
            try {
              const response = await fetch(`https://sepolia-optimism.etherscan.io/api?module=transaction&action=getstatus&txhash=${txHash}`);
              const data = await response.json();
              
              console.log("Transaction status response:", data);
              
              // If the API indicates an error in the transaction
              if (data?.status === "1" && data?.result?.isError === "1") {
                setDeploymentStatus("error");
                
                // Special case for the known error - this is now removed with the new contract
                if (data?.result?.errDescription?.includes("Provider already has a contract")) {
                  setErrorMessage("Provider already has a contract");
                } else {
                  setErrorMessage(data?.result?.errDescription || "Contract execution failed");
                }
              } else {
                // If we get here, default to success
                setDeploymentStatus("success");
              }
            } catch (innerErr) {
              console.error("Error in secondary verification:", innerErr);
              // Default to success if both verification methods fail
              setDeploymentStatus("success");
            }
          }
        } catch (err) {
          console.error("Error checking transaction status:", err);
          // Default to success if verification fails completely
          // This assumes that isSuccess from useTransaction is reliable enough
          setDeploymentStatus("success");
        } finally {
          setIsVerifying(false);
        }
      };
      
      checkTransactionStatus();
    }
    
    // Handle transaction error
    if (isError && deploymentStatus === "pending") {
      setDeploymentStatus("error");
      setErrorMessage("Transaction failed");
    }
  }, [txHash, isSuccess, isError, deploymentStatus, isVerifying]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!apiEndpoint || !maxEscrow || !tokenName || !tokenSymbol) {
      return;
    }

    setDeploymentStatus("idle");
    setErrorMessage("");
    setIsVerifying(false);
    setTxHash(undefined);
    
    // Call deployProviderContract on the ContractFactory
    writeContract({
      ...contractConfig,
      functionName: "deployProviderContract",
      args: [
        apiEndpoint,
        parseEther(maxEscrow),
        tokenName,
        tokenSymbol
      ],
    });
  };

  return (
    <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-12 font-mono bg-black text-white">
      <h1 className="text-3xl font-bold mb-8">
        launch your service.
      </h1>
      
      <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-1">
              service name
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="my awesome service"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">
              api endpoint
            </label>
            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="https://api.myservice.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">
              max escrow (eth)
            </label>
            <input
              type="number"
              value={maxEscrow}
              onChange={(e) => setMaxEscrow(e.target.value)}
              step="0.001"
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="0.1"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">
              token name
            </label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="my service token"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">
              token symbol
            </label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="mst"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isPending || deploymentStatus === "pending" || isVerifying}
            className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "submitting..." : 
             deploymentStatus === "pending" ? "confirming..." : 
             isVerifying ? "verifying..." : "launch service"}
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
          </button>
          
          {deploymentStatus === "error" && (
            <div className="text-red-500 mt-2 p-3 border border-red-500">
              <p className="font-bold">Deployment failed</p>
              <p>{errorMessage}</p>
              {txHash && (
                <a 
                  href={`https://sepolia-optimism.etherscan.io/tx/${txHash}`} 
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
              <p className="font-bold">Service successfully launched!</p>
              <p>Your service is now live on the blockchain.</p>
              {txHash && (
                <a 
                  href={`https://sepolia-optimism.etherscan.io/tx/${txHash}`} 
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