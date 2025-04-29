"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useManageService } from "@/context/ManageServiceContext";
import { setContractActive } from "@/services/contractServices";

export default function ContractActivation() {
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });
  const { address: walletAddress } = useAccount();

  const {
    providerContractAddress,
    providerContractDetails,
    ownerAddress,
    refreshData,
  } = useManageService();

  // Check if the current user is the owner
  const isOwner = ownerAddress === walletAddress;

  // Get contract status
  const isActive = providerContractDetails?.isActive;

  // Monitor transaction status and refresh data when confirmed
  useEffect(() => {
    if (txConfirmed) {
      setTransactionComplete(true);
      refreshData();
    }
  }, [txConfirmed, refreshData]);

  useEffect(() => {
    // Reset local state if contract address changes
    setError("");
    setIsProcessing(false);
    setTransactionComplete(false);
  }, [providerContractAddress]);

  const handleStatusChange = async (newStatus: boolean) => {
    if (!providerContractAddress) {
      setError("No contract address available");
      return;
    }

    try {
      setError("");
      setTransactionComplete(false);

      // Call the setContractStatus function
      await setContractActive(
        writeContract,
        providerContractAddress,
        newStatus
      );

      // The transaction is now pending, and will be monitored by the useWaitForTransactionReceipt hook
    } catch (err) {
      console.error("Contract status change failed:", err);
      setError(err instanceof Error ? err.message : "Status change failed");
      setIsProcessing(false);
    }
  };

  // Only show if we have contract details and the user is the owner
  if (!providerContractDetails || !isOwner) {
    return null;
  }

  // Derive processing state from wagmi hooks
  const isProcessingTx = isPending || isConfirming;

  return (
    <div className="mt-8 border border-gray-700 rounded-lg p-4">
      <h2 className="text-xl mb-4">Contract Status Management</h2>
      <p className="mb-4 text-sm">
        {isActive
          ? "Your contract is currently active. You can deactivate it if needed."
          : "Your contract is inactive. Activate it to allow token generation."}
      </p>

      {transactionComplete ? (
        <div className="bg-green-900/20 border border-green-700 p-3 rounded-md text-green-400 mb-4">
          Contract status successfully changed!
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 p-3 rounded-md text-red-400 mb-4">
          {error}
        </div>
      ) : isConfirming ? (
        <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-md text-blue-400 mb-4">
          Waiting for transaction confirmation...
        </div>
      ) : isPending ? (
        <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-md text-blue-400 mb-4">
          Transaction pending...
        </div>
      ) : null}

      <button
        disabled={isProcessingTx}
        onClick={() => handleStatusChange(!isActive)}
        className={`w-full py-3 px-4 rounded-md ${
          isProcessingTx
            ? "bg-blue-800 cursor-wait"
            : isActive
            ? "bg-red-700 hover:bg-red-600"
            : "bg-blue-700 hover:bg-blue-600"
        } transition-colors`}
      >
        {isProcessingTx
          ? isConfirming
            ? "Confirming..."
            : "Processing..."
          : isActive
          ? "Deactivate Contract"
          : "Activate Contract"}
      </button>
    </div>
  );
}
