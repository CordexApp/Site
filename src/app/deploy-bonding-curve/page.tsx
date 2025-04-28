"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
    useAccount,
    useReadContract,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";

export default function DeployBondingCurve() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  
  const tokenAddress = searchParams.get("tokenAddress");
  
  // State for form inputs
  const [initialTokenAmountPercentage, setInitialTokenAmountPercentage] = useState("50"); // Default to 50%
  
  // State for token info
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [allowance, setAllowance] = useState("0");
  
  // State for transaction flow
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [status, setStatus] = useState<"idle" | "approving" | "approved" | "deploying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Calculated absolute initial token amount
  const calculatedInitialTokenAmount = useMemo(() => {
    const balance = parseFloat(tokenBalance);
    const percentage = parseFloat(initialTokenAmountPercentage);
    if (isNaN(balance) || isNaN(percentage) || balance <= 0 || percentage <= 0 || percentage > 100) {
      return "0";
    }
    // Calculate absolute amount
    // Avoid rounding here to maintain precision for parseEther later
    const absoluteAmount = (balance * percentage) / 100;
    return absoluteAmount.toString();
  }, [tokenBalance, initialTokenAmountPercentage]);

  // ContractFactory address
  const factoryAddress = "0xca38c4d7889d7337ceea5c53db82f70f12a7b9e7" as `0x${string}`;
  
  // Token ABI (partial, only what we need)
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

  // Factory ABI (partial, only what we need)
  const factoryAbi = [
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
  ] as const;

  // Read token data
  const { data: nameData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "name",
    query: {
      enabled: !!tokenAddress
    }
  });

  const { data: symbolData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "symbol",
    query: {
      enabled: !!tokenAddress
    }
  });

  const { data: balanceData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!tokenAddress && !!address
    }
  });

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "allowance",
    args: address && tokenAddress ? [address, factoryAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!address,
      // No polling here, we refetch after successful approval tx
      // refetchInterval: status === "approving" ? 2000 : 0,
    }
  });

  // Update state when data is loaded
  useEffect(() => {
    if (nameData) setTokenName(nameData as string);
    if (symbolData) setTokenSymbol(symbolData as string);
    if (balanceData) setTokenBalance(formatEther(balanceData as bigint));
    if (allowanceData !== undefined) { // Check for undefined to handle initial load
      const formattedAllowance = formatEther(allowanceData as bigint);
      setAllowance(formattedAllowance);

      // Check if current allowance meets the requirement
      const requiredAmount = parseFloat(calculatedInitialTokenAmount);
      if (!isNaN(requiredAmount) && requiredAmount > 0 && parseFloat(formattedAllowance) >= requiredAmount) {
         // If already approved (e.g., on page load or after successful approve tx), move to approved state
         // Only transition if status is idle or approving, prevent accidental state changes
         if (status === "idle" || status === "approving") {
            console.log("Sufficient allowance detected. Moving to 'approved' state.");
            setStatus("approved");
         }
      } else if (status === "approved" && (isNaN(requiredAmount) || requiredAmount <= 0 || parseFloat(formattedAllowance) < requiredAmount)) {
         // If user changes amount *after* approval, making it insufficient, revert to 'idle'
         console.log("Allowance no longer sufficient. Reverting to 'idle' state.");
         setStatus("idle");
      }
    }
  }, [nameData, symbolData, balanceData, allowanceData, calculatedInitialTokenAmount, status]); // Add status to dependency array

  // Write contract hook
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

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Transaction error:", error);
      // Don't reset status if it's already 'success'
      if (status !== 'success') {
          setStatus("error");
          setErrorMessage(error.message || "Transaction failed");
      }
    }
  }, [error, status]);

  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Process transaction receipt
  useEffect(() => {
    if (receipt) {
      // Ensure we are processing the receipt for the current transaction hash
      if (receipt.transactionHash !== txHash) {
        console.log("Ignoring stale receipt for", receipt.transactionHash, "while waiting for", txHash);
        return; // This is a receipt from a previous transaction
      }

      if (receipt.status === "success") {
        if (status === "approving") {
          console.log("Approval transaction successful:", receipt);
          // Refetch allowance to confirm and trigger useEffect to change status
          refetchAllowance();
          // Clear the hash so this receipt isn't processed again if something else sets txHash
          // setTxHash(undefined); // Keep txHash for potential Etherscan link in success/error messages
        } else if (status === "deploying") {
          // This was the deployment transaction
          console.log("Deployment transaction successful:", receipt);
          setStatus("success");

          // Parse logs to find the deployed bonding curve address (Optional, based on factory event)
          // Example: Assumes factory emits an event like: event BondingCurveDeployed(address indexed providerToken, address bondingCurveAddress);
          // const factoryInterface = new Interface(factoryAbi); // Requires ethers Interface
          // let bondingCurveAddress: string | undefined;
          // try {
          //   for (const log of receipt.logs) {
          //     // Check if log originates from the factory and matches the expected event signature
          //     if (log.address.toLowerCase() === factoryAddress.toLowerCase()) {
          //       const parsedLog = factoryInterface.parseLog(log);
          //       if (parsedLog && parsedLog.name === "BondingCurveDeployed") { // Replace with actual event name
          //         bondingCurveAddress = parsedLog.args.bondingCurveAddress; // Replace with actual arg name
          //         console.log("Extracted bonding curve address:", bondingCurveAddress);
          //         break;
          //       }
          //     }
          //   }
          // } catch (logError) {
          //   console.warn("Could not parse logs to find bonding curve address:", logError);
          // }
          // if (!bondingCurveAddress) {
          //   console.warn("Could not extract bonding curve address from logs.");
          // }
        }
      } else {
        console.error("Transaction reverted:", receipt);
         // Don't reset status if it's already 'success'
        if (status !== 'success') {
            setStatus("error");
            setErrorMessage("Transaction reverted on the blockchain");
        }
      }
    }
    // Add refetchAllowance to dependencies
  }, [receipt, txHash, status, factoryAddress, refetchAllowance]);

  // Approve tokens function
  const approveTokens = (e: FormEvent) => {
    e.preventDefault();

    const amountToDeposit = calculatedInitialTokenAmount;

    if (!tokenAddress || !amountToDeposit || parseFloat(amountToDeposit) <= 0) {
      setErrorMessage("Invalid or missing token amount");
      setStatus("error"); // Set status to error to show message
      return;
    }

     // Check balance before approving
    if (parseFloat(amountToDeposit) > parseFloat(tokenBalance)) {
        setErrorMessage("Insufficient balance to approve this amount.");
        setStatus("error");
        return;
    }

    setStatus("approving");
    setErrorMessage("");

    try {
      // Use the calculated absolute amount, parsed to wei
      const amountToApprove = parseEther(amountToDeposit);

      console.log(`Requesting approval for ${amountToDeposit} ${tokenSymbol} ( ${amountToApprove} wei)`);

      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: tokenAbi,
        functionName: "approve",
        args: [factoryAddress, amountToApprove],
      });
    } catch (err) {
      console.error("Error calling approve:", err);
      setStatus("error");
      setErrorMessage(`Approval setup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Deploy bonding curve function
  const deployBondingCurve = (e: FormEvent) => {
    e.preventDefault();

    // Fixed bonding curve parameters
    const fixedSlope = BigInt("100000000000000"); // 0.0001 * 10^18
    const fixedIntercept = BigInt("10000000000000000"); // 0.01 * 10^18

    const amountToDeposit = calculatedInitialTokenAmount;
    const currentAllowance = parseFloat(allowance);
    const requiredAmount = parseFloat(amountToDeposit);

    if (!tokenAddress || isNaN(requiredAmount) || requiredAmount <= 0) {
      setErrorMessage("Missing or invalid required parameters.");
      setStatus("error");
      return;
    }

    // Double-check allowance before deploying
    if (isNaN(currentAllowance) || currentAllowance < requiredAmount) {
        setErrorMessage(`Insufficient allowance. Required: ${requiredAmount}, Approved: ${currentAllowance}`);
        setStatus("error");
        // Optional: revert state to idle? Or let user retry approval.
        // setStatus("idle");
        return;
    }

     // Double-check balance before deploying
    if (requiredAmount > parseFloat(tokenBalance)) {
        setErrorMessage("Insufficient balance to deploy this amount.");
        setStatus("error");
        return;
    }


    setStatus("deploying");
    setErrorMessage("");

    try {
      const depositAmountWei = parseEther(amountToDeposit);
      console.log(`Deploying bonding curve with initial amount: ${amountToDeposit} ${tokenSymbol} (${depositAmountWei} wei)`);

      writeContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "deployBondingCurveContract",
        args: [
          tokenAddress as `0x${string}`,
          depositAmountWei, // Use calculated absolute amount in wei
          fixedSlope,
          fixedIntercept,
        ],
      });
    } catch (err) {
      console.error("Error deploying bonding curve:", err);
      setStatus("error");
      setErrorMessage(`Deployment setup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Reset state if user changes amount significantly or clears it
  useEffect(() => {
      const requiredAmount = parseFloat(calculatedInitialTokenAmount);
      const currentAllowance = parseFloat(allowance);

      if (status === 'approved' && (isNaN(requiredAmount) || requiredAmount <= 0 || (!isNaN(currentAllowance) && currentAllowance < requiredAmount))) {
          console.log("Required amount changed and allowance is now insufficient. Resetting state.");
          setStatus('idle'); // Reset to idle so user has to re-approve
      }
  }, [calculatedInitialTokenAmount, allowance, status]);


  // Redirect if no token address
  useEffect(() => {
    if (!tokenAddress) {
      router.push("/launch");
    }
  }, [tokenAddress, router]);

  if (!tokenAddress) {
    return <div className="min-h-screen bg-black text-white p-8">Loading...</div>;
  }

  const requiredDepositAmount = useMemo(() => parseFloat(calculatedInitialTokenAmount), [calculatedInitialTokenAmount]);
  const currentAllowanceAmount = useMemo(() => parseFloat(allowance), [allowance]);
  const currentBalanceAmount = useMemo(() => parseFloat(tokenBalance), [tokenBalance]);
  const needsApproval = useMemo(() => isNaN(requiredDepositAmount) || requiredDepositAmount <= 0 || isNaN(currentAllowanceAmount) || currentAllowanceAmount < requiredDepositAmount, [requiredDepositAmount, currentAllowanceAmount]);
  const hasSufficientBalance = useMemo(() => !isNaN(requiredDepositAmount) && !isNaN(currentBalanceAmount) && currentBalanceAmount >= requiredDepositAmount, [requiredDepositAmount, currentBalanceAmount]);
  const canProceed = useMemo(() => !isNaN(requiredDepositAmount) && requiredDepositAmount > 0 && hasSufficientBalance, [requiredDepositAmount, hasSufficientBalance]);


  // Determine button states / UI flow based on calculated values and status
  let primaryActionForm: React.ReactNode | null = null;
  let displayStatus: string = "";

  if (status === "success") {
      // Display success message handled further down
  } else if (status === "error") {
      // Display error message handled further down
  } else if (status === "deploying" || (status === "approved" && (isPending || isWaitingForReceipt))) {
      // This condition handles when the deploy transaction is pending or waiting for receipt *after* approval.
      displayStatus = "Deploying curve...";
      primaryActionForm = (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Show the amount being deployed, but disabled */}
              <div>
                <label className="block text-sm mb-1">initial token amount (%)</label>
                <input
                  type="number"
                  value={initialTokenAmountPercentage}
                  className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
                  disabled={true} // Disable input during deployment
                />
                 <p className="text-xs mt-1">
                  (~{isNaN(requiredDepositAmount) ? '0' : requiredDepositAmount.toFixed(4)} {tokenSymbol}) - Approved: {isNaN(currentAllowanceAmount) ? '0' : Math.floor(currentAllowanceAmount).toString()} {tokenSymbol}
                </p>
              </div>
              <button disabled={true} className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {displayStatus}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
              </button>
          </form>
      );
  } else if (status === "approving" || (status === "idle" && (isPending || isWaitingForReceipt))) {
       // This condition handles when the approve transaction is pending or waiting for receipt.
      displayStatus = "Approving tokens...";
      primaryActionForm = (
           <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                {/* Show percentage input during approval process */}
                <div>
                  <label className="block text-sm mb-1">initial token amount (%) - recommend around 60-80%</label>
                  <input
                    type="number"
                    value={initialTokenAmountPercentage}
                    onChange={(e) => setInitialTokenAmountPercentage(e.target.value)}
                    className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
                    placeholder="50"
                    min="0"
                    max="100"
                    step="any"
                    required
                    // Disable input while transaction is pending
                    disabled={isPending || isWaitingForReceipt}
                  />
                  <p className="text-xs mt-1">
                    Percentage of your {tokenSymbol} balance to deposit.
                    (~{isNaN(requiredDepositAmount) ? '0' : requiredDepositAmount.toFixed(4)} {tokenSymbol})
                  </p>
                  <p className="text-xs mt-1 text-yellow-400">
                    This cannot be changed after deployment.
                  </p>
                </div>
                <button disabled={true} className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {displayStatus}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
                </button>
           </form>
      )
  } else if (status === "approved" && !needsApproval) {
       // Ready to deploy (status is 'approved', not pending/waiting, and allowance is sufficient)
       primaryActionForm = (
            <form onSubmit={deployBondingCurve} className="space-y-6">
                {/* Show percentage input; allow changes which might reset status */}
                 <div>
                  <label className="block text-sm mb-1">initial token amount (%)</label>
                  <input
                    type="number" // Keep as number to allow changes
                    value={initialTokenAmountPercentage}
                    onChange={(e) => setInitialTokenAmountPercentage(e.target.value)} // Allow changes
                    className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
                    placeholder="50"
                    min="0"
                    max="100"
                    step="any"
                    required
                    disabled={isPending || isWaitingForReceipt} // Should be false here, but good safety check
                  />
                   <p className="text-xs mt-1">
                    (~{isNaN(requiredDepositAmount) ? '0' : requiredDepositAmount.toFixed(4)} {tokenSymbol}) - Approved: {isNaN(currentAllowanceAmount) ? '0' : Math.floor(currentAllowanceAmount).toString()} {tokenSymbol}
                  </p>
                   <p className="text-xs mt-1 text-yellow-400">
                    Changing this amount may require re-approval.
                  </p>
                </div>

                <button
                  type="submit"
                  // Disable if amount invalid or balance insufficient
                  disabled={!canProceed}
                  className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!hasSufficientBalance
                    ? "error: insufficient balance"
                    : !canProceed // Check if amount is valid (> 0)
                    ? "enter valid amount"
                    : "deploy bonding curve"}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
                </button>
             </form>
       );
  } else {
      // Default state: Needs approval ('idle' status, or 'approved' but needsApproval is true)
       primaryActionForm = (
          <form onSubmit={approveTokens} className="space-y-6">
            <div>
              <label className="block text-sm mb-1">initial token amount (%) - recommend around 60-80%</label>
              <input
                type="number"
                value={initialTokenAmountPercentage}
                onChange={(e) => setInitialTokenAmountPercentage(e.target.value)}
                className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
                placeholder="50"
                min="0"
                max="100"
                step="any"
                required
                disabled={isPending || isWaitingForReceipt} // Should be false here, safety check
              />
              <p className="text-xs mt-1">
                Percentage of your {tokenSymbol} balance to deposit.
                (~{isNaN(requiredDepositAmount) ? '0' : requiredDepositAmount.toFixed(4)} {tokenSymbol})
              </p>
              <p className="text-xs mt-1 text-yellow-400">
                This cannot be changed after deployment.
              </p>
            </div>

            <button
              type="submit"
               // Disable if amount invalid or balance insufficient
              disabled={!canProceed}
              className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!hasSufficientBalance
                ? "insufficient balance"
                : !canProceed // Check if amount is valid (> 0)
                ? "enter valid amount"
                : `approve ${isNaN(requiredDepositAmount) ? '...' : requiredDepositAmount.toFixed(4)} ${tokenSymbol}`}
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </button>

            {/* Show warning if allowance exists but is lower than required */}
            {!isNaN(currentAllowanceAmount) && currentAllowanceAmount > 0 && !isNaN(requiredDepositAmount) && currentAllowanceAmount < requiredDepositAmount && (
              <p className="text-yellow-500 mt-2 text-xs">
                Current allowance ({Math.floor(currentAllowanceAmount).toString()} {tokenSymbol}) is less than the required amount ({requiredDepositAmount.toFixed(4)} {tokenSymbol}). You need to approve the new amount.
              </p>
            )}
          </form>
        );
  }


  return (
    <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-12 font-mono bg-black text-white">
      <h1 className="text-3xl font-bold mb-8">deploy bonding curve</h1>

      <div className="w-full max-w-lg mb-8">
        <div className="mb-6 p-4 border border-gray-700">
          <h2 className="text-xl mb-2">token details</h2>
          <p>Name: {tokenName || "Loading..."}</p>
          <p>Symbol: {tokenSymbol || "Loading..."}</p>
          <p>Address: {tokenAddress}</p>
          <p>Your Balance: {isNaN(currentBalanceAmount) ? "Loading..." : Math.floor(currentBalanceAmount).toString()} {tokenSymbol}</p>
          <p>Factory Allowance: {isNaN(currentAllowanceAmount) ? "Loading..." : Math.floor(currentAllowanceAmount).toString()} {tokenSymbol}</p>
        </div>

        <div className="mb-6 p-4 border border-gray-700">
          <h2 className="text-xl mb-2">bonding curve setup</h2>
          <p className="text-sm mb-4">
            Set the initial amount of your token to seed the bonding curve. This determines the starting liquidity and price.
          </p>
           <p className="text-sm mb-4">
            First, you must approve the factory contract to transfer this amount. Then, you can deploy the bonding curve.
          </p>
          <p className="text-sm font-bold text-yellow-400 mb-4">
            Important: The initial token amount deposited into the bonding curve cannot be changed after deployment.
          </p>
        </div>

        {/* Render the determined primary action form */}
        {primaryActionForm}


        {/* Status/Error/Success Messages */}
        {status === "error" && errorMessage && (
          <div className="text-red-500 mt-4 p-3 border border-red-500">
            <p className="font-bold">Operation failed</p>
            <p className="text-sm break-words">{errorMessage}</p>
            {txHash && (
              <a
                href={`https://sepolia-optimism.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative text-white font-medium group inline-block mt-2 text-sm"
              >
                view transaction
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
              </a>
            )}
            <button
              type="button"
              // Reset to idle, clear error and hash
              onClick={() => {
                  setStatus("idle");
                  setErrorMessage("");
                  setTxHash(undefined);
                  // Refetch allowance in case it changed or needs re-evaluation
                  refetchAllowance();
              }}
              className="relative text-white font-medium group px-4 py-2 mt-4 block text-sm"
            >
              try again
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="text-green-500 mt-4 p-3 border border-green-500 space-y-4">
            <p className="font-bold">bonding curve deployed!</p>
            <p className="text-sm">Your bonding curve has been successfully deployed with {isNaN(requiredDepositAmount) ? 'N/A' : requiredDepositAmount.toFixed(4)} {tokenSymbol}.</p>
            {txHash && (
              <a
                href={`https://sepolia-optimism.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative text-white font-medium group inline-block text-sm"
              >
                view deployment transaction
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
              </a>
            )}
             {/* TODO: Add button to navigate to the actual bonding curve page
                 This likely needs the bonding curve address, which requires parsing logs or a factory read method.
                 For now, just provide a placeholder or link back to launch.
             */}
             {/* <button
              type="button"
              onClick={() => router.push("/bonding-curve?curveAddress=" + FOUND_CURVE_ADDRESS)} // Replace with actual logic
              className="relative text-white font-medium group px-4 py-2 mt-4 block text-sm"
             >
                go to bonding curve page
               <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </button> */}
              <button
                type="button"
                onClick={() => router.push("/my-contracts")} // Link to my contracts page
                className="relative text-white font-medium group px-4 py-2 mt-2 block text-sm"
              >
                my contracts
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
              </button>
          </div>
        )}
      </div>
    </div>
  );
} 