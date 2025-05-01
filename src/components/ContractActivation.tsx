"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useManageService } from "@/context/ManageServiceContext";
import { setContractActive } from "@/services/contractServices";
import { PrimaryButton } from "./ui/PrimaryButton";
import { LoadingDots } from "./ui/LoadingDots";

export default function ContractActivation() {
  const [error, setError] = useState("");
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
      refreshData();
    }
  }, [txConfirmed, refreshData]);

  useEffect(() => {
    // Reset local state if contract address changes
    setError("");
  }, [providerContractAddress]);

  const handleStatusChange = async (newStatus: boolean) => {
    if (!providerContractAddress) {
      setError("No contract address available");
      return;
    }

    try {
      setError("");
      await setContractActive(
        writeContract,
        providerContractAddress,
        newStatus
      );
    } catch (err) {
      console.error("Contract status change failed:", err);
      setError(err instanceof Error ? err.message : "Status change failed");
    }
  };

  // Only show if we have contract details and the user is the owner
  if (!providerContractDetails || !isOwner) {
    return null;
  }

  // Derive processing state from wagmi hooks
  const isProcessingTx = isPending || isConfirming;

  return (
    <div>
      {error && <div className="text-cordex-red">{error}</div>}

      <PrimaryButton
        onClick={() => handleStatusChange(!isActive)}
        disabled={isProcessingTx}
      >
        {isProcessingTx ? (
          <LoadingDots text={isPending ? "Processing" : "Confirming"} />
        ) : isActive ? (
          "Deactivate"
        ) : (
          "Activate"
        )}
      </PrimaryButton>
    </div>
  );
}
