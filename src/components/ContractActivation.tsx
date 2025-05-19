"use client";

import { useManageService } from "@/context/ManageServiceContext";
import { setContractActive } from "@/services/contractServices";
import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { LoadingDots } from "./ui/LoadingDots";
import { SecondaryButton } from "./ui/SecondaryButton";

export default function ContractActivation() {
  const { address: walletAddress } = useAccount();
  const {
    providerContractAddress,
    ownerAddress,
    providerContractDetails,
    refreshData,
  } = useManageService();

  const [isActiveLocal, setIsActiveLocal] = useState<boolean | null>(null);

  // Initialize local state from contract details
  useEffect(() => {
    if (providerContractDetails?.isActive !== undefined) {
      setIsActiveLocal(providerContractDetails.isActive);
    }
  }, [providerContractDetails?.isActive]);

  // Contract write hook for changing active status
  const {
    writeContract,
    data: txHash,
    isPending,
    error,
  } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Refresh data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && txHash) {
      refreshData();
    }
  }, [isConfirmed, refreshData, txHash]);

  // Don't show if not owner
  const isOwner = ownerAddress === walletAddress;
  if (!isOwner || !providerContractAddress) {
    return null;
  }

  // Toggle contract active status
  const toggleActive = () => {
    if (!providerContractAddress) return;
    
    const newStatus = !isActiveLocal;
    
    setContractActive(
      writeContract,
      providerContractAddress,
      newStatus
    );
  };

  return (
    <div className="border border-gray-700 rounded-md p-4 mt-4">
      <h3 className="text-lg font-medium mb-3">Contract Status</h3>
      
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${isActiveLocal ? "bg-green-500" : "bg-cordex-red"}`}></div>
          <span className="text-sm">
            {isActiveLocal ? "Contract is active" : "Contract is inactive"}
          </span>
        </div>
        
        <p className="text-sm text-gray-400">
          {isActiveLocal 
            ? "Users can interact with your service and generate tokens."
            : "Users cannot interact with your service while inactive."}
        </p>
        
        {error && (
          <p className="text-sm text-cordex-red">
            Error: {error.message || "Failed to update contract status"}
          </p>
        )}
        
        <SecondaryButton
          onClick={toggleActive}
          disabled={isPending || isConfirming}
          className="mt-2"
        >
          {isPending || isConfirming ? (
            <LoadingDots text={isConfirming ? "confirming" : "processing"} />
          ) : (
            isActiveLocal ? "Deactivate Contract" : "Activate Contract"
          )}
        </SecondaryButton>
      </div>
    </div>
  );
} 