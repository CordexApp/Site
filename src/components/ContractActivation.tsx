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

  // Don't show if not owner or wallet not connected
  const isOwner = ownerAddress === walletAddress;
  if (!isOwner || !providerContractAddress) {
    return null;
  }

  // Toggle contract active status
  const toggleActive = () => {
    if (!providerContractAddress || !walletAddress) return;
    
    const newStatus = !isActiveLocal;
    
    setContractActive(
      writeContract,
      providerContractAddress,
      newStatus
    );
  };

  return (
    <div className="border border-gray-700 rounded-md p-4">
      <h3 className="text-lg font-medium mb-3">Contract Status</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">
            Status: <span className={`font-semibold ${isActiveLocal ? 'text-green-400' : 'text-red-400'}`}>
              {isActiveLocal ? 'Active' : 'Inactive'}
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isActiveLocal ? 'Users can interact with your service' : 'Service is currently disabled'}
          </p>
        </div>
        
        <SecondaryButton
          onClick={toggleActive}
          disabled={!walletAddress || isPending || isConfirming}
          className="ml-4"
        >
          {!walletAddress ? (
            "connect wallet"
          ) : isPending || isConfirming ? (
            <LoadingDots text={isConfirming ? "confirming" : (isActiveLocal ? "deactivating" : "activating")} />
          ) : (
            isActiveLocal ? "Deactivate" : "Activate"
          )}
        </SecondaryButton>
      </div>
    </div>
  );
} 