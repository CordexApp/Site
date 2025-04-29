import React, { createContext, useContext, useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  getProviderContractAddress,
  checkContractActive,
  getContractProvider,
  getContractMaxEscrow,
} from "@/services/contractServices";
import { getBondingCurveContract } from "@/services/bondingCurveServices";
import { contractConfig } from "@/services/contractServices";
import { ProviderContractAbi } from "@/abis/ProviderContract";

// Define the shape of a service/contract
export type ProviderServiceDetails = {
  providerContractAddress: `0x${string}`;
  isActive: boolean;
  apiEndpoint?: string;
  maxEscrow?: string;
  providerAddress?: `0x${string}` | null;
  bondingCurveAddress?: `0x${string}` | null;
};

// Define the context type
type MyServicesContextType = {
  isLoading: boolean;
  error: string | null;
  services: ProviderServiceDetails[];
  refreshServices: () => void;
};

// Create the context
const MyServicesContext = createContext<MyServicesContextType | undefined>(
  undefined
);

// Custom hook to use the context
export const useMyServices = () => {
  const context = useContext(MyServicesContext);
  if (!context) {
    throw new Error("useMyServices must be used within a MyServicesProvider");
  }
  return context;
};

// Provider component
export const MyServicesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ProviderServiceDetails[]>([]);

  // Function to fetch all provider contracts for the connected wallet
  const fetchProviderContracts = async () => {
    if (!address || !publicClient) {
      setServices([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get all provider contracts for this wallet from the factory
      const providerContractsData = await publicClient.readContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: "getProviderContracts",
        args: [address],
      });

      const contractAddresses = providerContractsData as `0x${string}`[];
      console.log("Found provider contracts:", contractAddresses);

      // Fetch details for each contract
      const contractDetails = await Promise.all(
        contractAddresses.map(async (contractAddress) => {
          try {
            // Check if contract is active
            const isActive = await checkContractActive(
              publicClient,
              contractAddress
            );

            // Get provider address
            const providerAddress = await getContractProvider(
              publicClient,
              contractAddress
            );

            // Get max escrow
            const maxEscrow = await getContractMaxEscrow(
              publicClient,
              contractAddress
            );

            // Get bonding curve address
            const bondingCurveAddress = await getBondingCurveContract(
              publicClient,
              contractAddress
            );

            // Get API endpoint
            let apiEndpoint = "";
            try {
              apiEndpoint = (await publicClient.readContract({
                address: contractAddress,
                abi: ProviderContractAbi,
                functionName: "apiEndpoint",
              })) as string;
            } catch (endpointError) {
              console.error("Error fetching API endpoint:", endpointError);
            }

            return {
              providerContractAddress: contractAddress,
              isActive,
              apiEndpoint,
              maxEscrow: maxEscrow || undefined,
              providerAddress,
              bondingCurveAddress,
            };
          } catch (error) {
            console.error(
              `Error fetching details for contract ${contractAddress}:`,
              error
            );
            return {
              providerContractAddress: contractAddress,
              isActive: false,
            };
          }
        })
      );

      setServices(contractDetails as ProviderServiceDetails[]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching provider contracts:", error);
      setError("Failed to load your services. Please try again later.");
      setIsLoading(false);
    }
  };

  // Load contracts when the wallet address changes
  useEffect(() => {
    fetchProviderContracts();
  }, [address, publicClient]);

  // Provide context value
  const value = {
    isLoading,
    error,
    services,
    refreshServices: fetchProviderContracts,
  };

  return (
    <MyServicesContext.Provider value={value}>
      {children}
    </MyServicesContext.Provider>
  );
};
