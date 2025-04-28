"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import {
    useAccount,
    useReadContract,
    useWaitForTransactionReceipt,
    useWriteContract
} from "wagmi";

export default function MyContracts() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [providerContracts, setProviderContracts] = useState<Array<{address: string, name: string}>>([]);
  const [providerTokens, setProviderTokens] = useState<Array<{address: string, name: string, symbol: string, balance: string}>>([]);
  const [bondingCurves, setBondingCurves] = useState<Array<{
    address: string, 
    tokenAddress: string,
    tokenName: string,
    tokenSymbol: string,
    accumulatedFees: string,
    tokenSupply: string
  }>>([]);
  
  // Selected contract for actions
  const [selectedCurve, setSelectedCurve] = useState<string | null>(null);
  const [tokenAllowance, setTokenAllowance] = useState("0");
  
  // Transaction state
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [actionStatus, setActionStatus] = useState<"idle" | "executing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // ContractFactory address
  const factoryAddress = "0xca38c4d7889d7337ceea5c53db82f70f12a7b9e7" as `0x${string}`;
  
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
  
  // Provider Contract ABI (partial)
  const providerAbi = [
    {
      inputs: [],
      name: "apiEndpoint",
      outputs: [{ name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "maxEscrow",
      outputs: [{ name: "", type: "uint256" }],
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
    {
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      name: "transfer",
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
      name: "tokenSupply",
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
    {
      inputs: [{ name: "_tokenAmount", type: "uint256" }],
      name: "sellTokens",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ name: "_tokenAmount", type: "uint256" }],
      name: "buyTokens",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "getCurrentPrice",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;
  
  // Fetch all contracts for the connected address
  const { data: contractData, isError: isContractError } = useReadContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getProviderContracts",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });
  
  // Fetch all tokens for the connected address
  const { data: tokenData, isError: isTokenError } = useReadContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getProviderTokens",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });
  
  // Fetch all bonding curves for the connected address
  const { data: curveData, isError: isCurveError } = useReadContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getBondingCurveContracts",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });
  
  // Fetch token details after we have the token addresses
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!tokenData || tokenData.length === 0) return;
      
      const tokenAddresses = tokenData as `0x${string}`[];
      const detailsPromises = tokenAddresses.map(async (tokenAddress) => {
        try {
          // Create a minimal provider to read token data
          const nameResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=name`);
          const symbolResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=symbol`);
          const balanceResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=balanceOf&args=${address}`);
          
          if (!nameResult.ok || !symbolResult.ok || !balanceResult.ok) {
            throw new Error("Failed to fetch token details");
          }
          
          const nameData = await nameResult.json();
          const symbolData = await symbolResult.json();
          const balanceData = await balanceResult.json();
          
          return {
            address: tokenAddress,
            name: nameData.result || "Unknown Token",
            symbol: symbolData.result || "???",
            balance: formatEther(balanceData.result || 0),
          };
        } catch (error) {
          console.error("Error fetching token details:", error);
          return {
            address: tokenAddress,
            name: "Error Loading",
            symbol: "ERR",
            balance: "0",
          };
        }
      });
      
      const tokenDetails = await Promise.all(detailsPromises);
      setProviderTokens(tokenDetails);
    };
    
    fetchTokenDetails();
  }, [tokenData, address]);
  
  // Fetch bonding curve details after we have the curve addresses
  useEffect(() => {
    const fetchCurveDetails = async () => {
      if (!curveData || curveData.length === 0) return;
      
      const curveAddresses = curveData as `0x${string}`[];
      const detailsPromises = curveAddresses.map(async (curveAddress) => {
        try {
          // Fetch token address from bonding curve
          const tokenAddressResult = await fetch(`/api/read-contract?address=${curveAddress}&function=providerTokenAddress`);
          const accumulatedFeesResult = await fetch(`/api/read-contract?address=${curveAddress}&function=accumulatedFees`);
          
          if (!tokenAddressResult.ok || !accumulatedFeesResult.ok) {
            throw new Error("Failed to fetch bonding curve details");
          }
          
          const tokenAddressData = await tokenAddressResult.json();
          const accumulatedFeesData = await accumulatedFeesResult.json();
          
          const tokenAddress = tokenAddressData.result as string;
          
          // Fetch token name and symbol
          const nameResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=name`);
          const symbolResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=symbol`);
          
          if (!nameResult.ok || !symbolResult.ok) {
            throw new Error("Failed to fetch token details");
          }
          
          const nameData = await nameResult.json();
          const symbolData = await symbolResult.json();
          
          // Get the token balance of the bonding curve contract
          const tokenSupplyResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=balanceOf&args=${curveAddress}`);
          if (!tokenSupplyResult.ok) {
            throw new Error("Failed to fetch token supply");
          }
          const tokenSupplyData = await tokenSupplyResult.json();
          
          return {
            address: curveAddress,
            tokenAddress,
            tokenName: nameData.result || "Unknown Token",
            tokenSymbol: symbolData.result || "???",
            accumulatedFees: formatEther(accumulatedFeesData.result || 0),
            tokenSupply: formatEther(tokenSupplyData.result || 0),
          };
        } catch (error) {
          console.error("Error fetching curve details:", error);
          return {
            address: curveAddress,
            tokenAddress: "0x0000000000000000000000000000000000000000",
            tokenName: "Error Loading",
            tokenSymbol: "ERR",
            accumulatedFees: "0",
            tokenSupply: "0",
          };
        }
      });
      
      const curveDetails = await Promise.all(detailsPromises);
      setBondingCurves(curveDetails);
    };
    
    fetchCurveDetails();
  }, [curveData]);
  
  // Update loading state when all data is fetched
  useEffect(() => {
    if (
      (contractData !== undefined || isContractError) &&
      (tokenData !== undefined || isTokenError) &&
      (curveData !== undefined || isCurveError) &&
      providerTokens.length > 0
    ) {
      setIsLoading(false);
    }
  }, [contractData, tokenData, curveData, providerTokens, isContractError, isTokenError, isCurveError]);
  
  // Check allowance when a curve is selected
  useEffect(() => {
    const checkAllowance = async () => {
      if (!selectedCurve || !address) return;
      
      const curve = bondingCurves.find(c => c.address === selectedCurve);
      if (!curve) return;
      
      try {
        const result = await fetch(`/api/read-contract?address=${curve.tokenAddress}&function=allowance&args=${address},${selectedCurve}`);
        if (result.ok) {
          const data = await result.json();
          setTokenAllowance(formatEther(data.result || 0));
        }
      } catch (error) {
        console.error("Error checking allowance:", error);
      }
    };
    
    checkAllowance();
  }, [selectedCurve, address, bondingCurves]);
  
  // Write contract hooks
  const {
    writeContract,
    isPending,
    error,
    data: writeData,
  } = useWriteContract();
  
  // Update txHash when writeData is available
  useEffect(() => {
    if (writeData) {
      console.log("Transaction submitted:", writeData);
      setTxHash(writeData);
    }
  }, [writeData]);
  
  // Add a function to refresh curve data
  const refreshCurveData = async () => {
    if (!curveData || curveData.length === 0) return;

    const curveAddresses = curveData as `0x${string}`[];
    const detailsPromises = curveAddresses.map(async (curveAddress) => {
        try {
            // Fetch token address from bonding curve and accumulated fees
            const tokenAddressResult = await fetch(`/api/read-contract?address=${curveAddress}&function=providerTokenAddress`);
            const accumulatedFeesResult = await fetch(`/api/read-contract?address=${curveAddress}&function=accumulatedFees`);

            if (!tokenAddressResult.ok || !accumulatedFeesResult.ok) {
                throw new Error("Failed to fetch bonding curve primary details");
            }

            const tokenAddressData = await tokenAddressResult.json();
            const accumulatedFeesData = await accumulatedFeesResult.json();
            const tokenAddress = tokenAddressData.result as string;

            if (!tokenAddress) {
                throw new Error("Token address not found in bonding curve data");
            }

            // Fetch token name, symbol, and the curve's balance (supply) using the fetched tokenAddress
            const nameResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=name`);
            const symbolResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=symbol`);
            // Correctly fetch the token balance held by the curve address
            const tokenSupplyResult = await fetch(`/api/read-contract?address=${tokenAddress}&function=balanceOf&args=${curveAddress}`);

            if (!nameResult.ok || !symbolResult.ok || !tokenSupplyResult.ok) {
                throw new Error("Failed to fetch token details or supply for bonding curve");
            }

            const nameData = await nameResult.json();
            const symbolData = await symbolResult.json();
            const tokenSupplyData = await tokenSupplyResult.json();

            return {
                address: curveAddress,
                tokenAddress,
                tokenName: nameData.result || "Unknown Token",
                tokenSymbol: symbolData.result || "???",
                accumulatedFees: formatEther(accumulatedFeesData.result || 0),
                tokenSupply: formatEther(tokenSupplyData.result || 0), // Use the correctly fetched supply
            };
        } catch (error) {
            console.error("Error fetching curve details during refresh:", error);
            return {
                address: curveAddress,
                tokenAddress: "0x0000000000000000000000000000000000000000",
                tokenName: "Error Loading",
                tokenSymbol: "ERR",
                accumulatedFees: "0",
                tokenSupply: "0", // Indicate error in supply as well
            };
        }
    });

    const curveDetails = await Promise.all(detailsPromises);
    setBondingCurves(curveDetails);
  };
  
  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });
  
  // Log txHash and loading state for debugging
  console.log("Current txHash state:", txHash);
  console.log("isWaitingForReceipt:", isWaitingForReceipt);
  
  // Process transaction receipt
  useEffect(() => {
    // Log whenever this effect runs and receipt is available
    if (receipt) {
      console.log("Receipt useEffect triggered. Receipt:", receipt);
      console.log("Receipt Status:", receipt.status);

      if (receipt.status === "success") {
        console.log("Processing SUCCESSFUL receipt");
        // Set success state ONLY if we were previously executing
        // This prevents setting success state if receipt arrives late after user interaction
        if (actionStatus === "executing") {
            setActionStatus("success");
            setSuccessMessage("Successfully withdrew fees!");
            setErrorMessage("");
            refreshCurveData();
            setTimeout(() => {
              setActionStatus("idle");
              setTxHash(undefined);
            }, 3000);
        } else {
             console.log("Receipt successful, but actionStatus wasn't 'executing'. Current status:", actionStatus);
        }
      } else { // Transaction failed or reverted
        console.log(`Processing FAILED/REVERTED receipt (Status: ${receipt.status})`);
        // Set error state ONLY if we were previously executing
        if (actionStatus === "executing") {
            setActionStatus("error");
            setErrorMessage(`Transaction failed on-chain (Status: ${receipt.status}). Check Etherscan.`);
            setSuccessMessage("");
        } else {
            console.log("Receipt failed, but actionStatus wasn't 'executing'. Current status:", actionStatus);
        }
      }
    } else {
        // Log if effect runs but receipt is falsy (shouldn't happen often after isWaiting becomes false)
        // console.log("Receipt useEffect triggered, but receipt is falsy.");
    }
  // Depending primarily on receipt. Check actionStatus internally.
  }, [receipt, refreshCurveData]); 
  
  // Handle specific errors potentially caught earlier by useWriteContract
  useEffect(() => {
    if (error) {
      console.error("useWriteContract error hook triggered:", error);
      // This might provide a more specific revert reason than the receipt alone
      // Let's update the status and message if we're in a pending/executing state
      if (actionStatus === 'executing' || isPending || isWaitingForReceipt) {
          setActionStatus("error");
          const errorMsg = error instanceof Error ? error.message : String(error);
          let displayMsg = `Error: ${errorMsg}`;
          // Try to parse a more specific revert reason
          if (errorMsg.includes("execution reverted:")) {
            const revertReason = errorMsg.split("execution reverted:")[1]?.trim();
            displayMsg = `Error: ${revertReason || "Contract execution failed"}`;
          } else if (errorMsg.includes("execution reverted")) { // Fallback for slightly different formatting
             const revertReason = errorMsg.split("execution reverted")[1]?.trim();
             displayMsg = `Error: ${revertReason || "Contract execution failed"}`;
          }
          setErrorMessage(displayMsg);
          setSuccessMessage("");
      }
    }
  }, [error, actionStatus, isPending, isWaitingForReceipt]);
  
  // Withdraw fees from bonding curve
  const withdrawFees = (curveAddress: string) => {
    setActionStatus("executing");
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      writeContract({
        address: curveAddress as `0x${string}`,
        abi: bondingCurveAbi,
        functionName: "withdrawFees",
        args: [],
      });
    } catch (error) {
      console.error("Error withdrawing fees:", error);
      setActionStatus("error");
      // Extract the error message from the error object
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check if it's a contract error (contains "execution reverted")
      if (errorMessage.includes("execution reverted")) {
        // Try to extract the specific error message from the revert
        const revertMessage = errorMessage.split("execution reverted")[1]?.trim() || "Contract execution failed";
        setErrorMessage(`Error: ${revertMessage}`);
      } else {
        setErrorMessage(`Error: ${errorMessage}`);
      }
    }
  };
  
  // Redirect if not connected
  useEffect(() => {
    if (!isConnected && !isLoading) {
      router.push("/");
    }
  }, [isConnected, isLoading, router]);
  
  if (!isConnected || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
        <div className="animate-pulse text-xl">{isLoading ? "loading your contracts..." : "please connect your wallet"}</div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-12 py-12 font-mono bg-black text-white">
      <div className="flex justify-between items-center w-full mb-8">
        <h1 className="text-3xl font-bold">my contracts</h1>
        <button
          onClick={refreshCurveData}
          className="text-sm border border-gray-600 hover:border-white px-2 py-1"
        >
          refresh data
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Provider Tokens */}
        <div className="mb-8">
          <h2 className="text-xl font-bold border-b border-gray-700 pb-2 mb-4">your tokens</h2>
          {providerTokens.length > 0 ? (
            <div className="space-y-4">
              {providerTokens.map((token) => {
                // Check if this token already has a bonding curve
                const hasBondingCurve = bondingCurves.some(curve => curve.tokenAddress === token.address);
                
                return (
                  <div key={token.address} className="p-4 border border-gray-700">
                    <h3 className="font-bold">{token.name} ({token.symbol})</h3>
                    <p className="text-sm mb-2">token address: {token.address}</p>
                    <p>balance: {token.balance} {token.symbol}</p>
                    <div className="mt-2">
                      {!hasBondingCurve ? (
                        <button
                          onClick={() => router.push(`/deploy-bonding-curve?tokenAddress=${token.address}`)}
                          className="text-sm border border-gray-600 hover:border-white px-2 py-1 mt-2"
                        >
                          deploy bonding curve
                        </button>
                      ) : (
                        <p className="text-sm text-gray-400 mt-2">bonding curve already deployed</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400">no tokens found.</p>
          )}
        </div>
        
        {/* Bonding Curves */}
        <div className="mb-8">
          <h2 className="text-xl font-bold border-b border-gray-700 pb-2 mb-4">your bonding curves</h2>
          {bondingCurves.length > 0 ? (
            <div className="space-y-4">
              {bondingCurves.map((curve) => (
                <div 
                  key={curve.address} 
                  className={`p-4 border ${selectedCurve === curve.address ? 'border-white' : 'border-gray-700'}`}
                >
                  <h3 className="font-bold">{curve.tokenName} ({curve.tokenSymbol}) bonding curve</h3>
                  <p className="text-sm mb-1">curve address: {curve.address}</p>
                  <p className="text-sm mb-1">token address: {curve.tokenAddress}</p>
                  <p className="text-sm mb-1">token supply: {curve.tokenSupply} {curve.tokenSymbol}</p>
                  <p className="text-sm mb-3">accumulated fees: {curve.accumulatedFees} crdx</p>
                  
                  {selectedCurve !== curve.address ? (
                    <button
                      onClick={() => setSelectedCurve(curve.address)}
                      className="text-sm border border-gray-600 hover:border-white px-2 py-1"
                    >
                      manage
                    </button>
                  ) : (
                    <div className="border-t border-gray-700 pt-3 mt-3">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => withdrawFees(curve.address)}
                          disabled={isPending || isWaitingForReceipt}
                          className={`text-sm border px-2 py-1 disabled:opacity-50 ${
                            parseFloat(curve.accumulatedFees) > 0 
                              ? 'border-green-800 hover:border-green-500' 
                              : 'border-gray-600 hover:border-white'
                          }`}
                        >
                          {parseFloat(curve.accumulatedFees) > 0 
                            ? `withdraw ${curve.accumulatedFees} crdx fees`
                            : 'withdraw fees (0 crdx)'}
                        </button>
                        
                        <button
                          onClick={() => setSelectedCurve(null)}
                          className="text-sm border border-gray-600 hover:border-white px-2 py-1 mt-2"
                        >
                          close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">no bonding curves found.</p>
          )}
        </div>
      </div>
      
      {/* Status Messages */}
      {actionStatus === "error" && (
        <div className="mt-4 p-3 border border-red-500 text-red-500 w-full max-w-lg">
          <p className="font-bold">error</p>
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
          <button
            onClick={() => setActionStatus("idle")}
            className="text-sm border border-gray-600 hover:border-white px-2 py-1 mt-2 block"
          >
            dismiss
          </button>
        </div>
      )}
      
      {actionStatus === "success" && (
        <div className="mt-4 p-3 border border-green-500 text-green-500 w-full max-w-lg">
          <p className="font-bold">success</p>
          <p>{successMessage}</p>
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
          <button
            onClick={() => setActionStatus("idle")}
            className="text-sm border border-gray-600 hover:border-white px-2 py-1 mt-2 block"
          >
            dismiss
          </button>
        </div>
      )}
      
      {/* Actions Section */}
      <div className="mt-8 w-full">
        <h2 className="text-xl font-bold border-b border-gray-700 pb-2 mb-4">actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => router.push("/launch")}
            className="border border-gray-600 hover:border-white px-4 py-2"
          >
            launch new service
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="border border-gray-600 hover:border-white px-4 py-2"
          >
            browse services
          </button>
        </div>
      </div>
    </div>
  );
} 