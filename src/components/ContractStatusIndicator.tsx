"use client";

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import {
  checkContractActive,
  getContractProvider,
} from "@/services/contractServices";

interface ContractStatusIndicatorProps {
  contractAddress: string;
}

interface ContractStatus {
  isActive: boolean;
  provider: string | null;
  lastChecked: Date;
}

export default function ContractStatusIndicator({
  contractAddress,
}: ContractStatusIndicatorProps) {
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    const checkStatus = async () => {
      console.log(
        "[ContractStatusIndicator] Checking status for contract:",
        contractAddress
      );
      setIsLoading(true);

      try {
        if (!publicClient || !contractAddress) {
          throw new Error("Client or contract address not available");
        }

        // Check if contract is active
        const isActive = await checkContractActive(
          publicClient,
          contractAddress as `0x${string}`
        );

        // Get provider address
        const provider = await getContractProvider(
          publicClient,
          contractAddress as `0x${string}`
        );

        console.log("[ContractStatusIndicator] Contract status:", {
          isActive,
          provider,
        });

        setStatus({
          isActive,
          provider,
          lastChecked: new Date(),
        });
      } catch (error) {
        console.error(
          "[ContractStatusIndicator] Error checking status:",
          error
        );
        setStatus({
          isActive: false,
          provider: null,
          lastChecked: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (contractAddress) {
      checkStatus();
    }

    // Check contract status every 60 seconds
    const intervalId = setInterval(checkStatus, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [contractAddress, publicClient]);

  if (isLoading && !status) {
    return (
      <span className="flex items-center">
        <span className="h-3 w-3 rounded-full bg-gray-400 mr-2"></span>
        <span className="text-sm text-gray-400">checking contract...</span>
      </span>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <span className="flex items-center">
      <span
        className={`h-3 w-3 rounded-full ${
          status.isActive ? "bg-green-500" : "bg-red-500"
        } mr-2`}
      ></span>
      <span className="">
        {status.isActive ? "contract active" : "contract inactive"}
      </span>

      {/* Tooltip with detailed status info */}
      <span
        className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-black border border-gray-700 rounded-md shadow-lg 
                    text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10"
      >
        <p className="font-semibold mb-1">
          {status.isActive ? "contract is active" : "contract is inactive"}
        </p>
        <p className="text-gray-300">
          last checked: {status.lastChecked.toLocaleTimeString()}
        </p>
        {status.provider && (
          <p className="text-gray-300 mt-1 break-all">
            provider: {status.provider}
          </p>
        )}
        {!status.isActive && (
          <p className="text-yellow-400 mt-1">
            you cannot interact with this contract until the provider activates
            it.
          </p>
        )}
      </span>
    </span>
  );
}
