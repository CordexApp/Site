"use client";

import { getContractMaxEscrow } from "@/services/contractServices";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

interface ContractMaxEscrowIndicatorProps {
  contractAddress: string;
}

interface MaxEscrowStatus {
  value: string | null;
  lastChecked: Date;
}

export default function ContractMaxEscrowIndicator({
  contractAddress,
}: ContractMaxEscrowIndicatorProps) {
  const [status, setStatus] = useState<MaxEscrowStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    const checkMaxEscrow = async () => {
      console.log(
        "[ContractMaxEscrowIndicator] Checking maxEscrow for contract:",
        contractAddress
      );
      setIsLoading(true);

      try {
        if (!publicClient || !contractAddress) {
          throw new Error("Client or contract address not available");
        }

        // Get maxEscrow value
        const maxEscrow = await getContractMaxEscrow(
          publicClient,
          contractAddress as `0x${string}`
        );

        console.log(
          "[ContractMaxEscrowIndicator] Contract maxEscrow:",
          maxEscrow
        );

        setStatus({
          value: maxEscrow,
          lastChecked: new Date(),
        });
      } catch (error) {
        console.error(
          "[ContractMaxEscrowIndicator] Error checking maxEscrow:",
          error
        );
        setStatus({
          value: null,
          lastChecked: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (contractAddress) {
      checkMaxEscrow();
    }

    // Check maxEscrow every 60 seconds
    const intervalId = setInterval(checkMaxEscrow, 120000);

    return () => {
      clearInterval(intervalId);
    };
  }, [contractAddress, publicClient]);

  if (isLoading && !status) {
    return (
      <div className="flex items-center">
        <span className="text-sm text-gray-400">Loading escrow amount...</span>
      </div>
    );
  }

  if (!status || status.value === null) {
    return (
      <div className="flex items-center">
        <span className="text-sm text-gray-400">Escrow amount unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center group relative">
      <span className="text-sm text-gray-300">
        Escrow Amount: {status.value} CRDX
      </span>

      {/* Tooltip with additional info */}
      <div
        className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-black border border-gray-700 rounded-md shadow-lg 
                     text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10"
      >
        <p className="font-semibold mb-1">Contract Max Escrow</p>
        <p className="text-gray-300">
          Last checked: {status.lastChecked.toLocaleTimeString()}
        </p>
        <p className="text-gray-300 mt-1">
          This is the amount of tokens required for making a request to the
          service. The actual cost may be less.
        </p>
      </div>
    </div>
  );
}
