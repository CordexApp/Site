"use client";

import { ProviderContractAbi } from "@/abis/ProviderContract";
import {
    getBondingCurveContract,
} from "@/services/bondingCurveServices";
import {
    checkContractActive,
    contractConfig,
    getContractMaxEscrow,
    getContractProvider
} from "@/services/contractServices";
import { fetchAndCalculateMarketCap, MarketCapDetails } from "@/utils/marketCapUtils";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

// Define the shape of a service/contract
export type ProviderServiceDetails = {
  providerContractAddress: `0x${string}`;
  isActive: boolean;
  apiEndpoint?: string;
  maxEscrow?: string;
  providerAddress?: `0x${string}` | null;
  bondingCurveAddress?: `0x${string}` | null;
} & Partial<MarketCapDetails>;

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

      const providerContractsData = await publicClient.readContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: "getProviderContracts",
        args: [address],
      });

      const contractAddresses = providerContractsData as `0x${string}`[];
      console.log("[MyServicesContext] Found provider contracts:", contractAddresses);

      const contractDetailsPromises = contractAddresses.map(async (contractAddress) => {
        let serviceDetail: Partial<ProviderServiceDetails> = {
            providerContractAddress: contractAddress,
            isActive: false,
        };
        try {
          serviceDetail.isActive = await checkContractActive(
            publicClient,
            contractAddress
          );
          serviceDetail.providerAddress = await getContractProvider(
            publicClient,
            contractAddress
          );
          serviceDetail.maxEscrow = await getContractMaxEscrow(
            publicClient,
            contractAddress
          );
          serviceDetail.bondingCurveAddress = await getBondingCurveContract(
            publicClient,
            contractAddress
          );

          try {
            serviceDetail.apiEndpoint = (await publicClient.readContract({
              address: contractAddress,
              abi: ProviderContractAbi,
              functionName: "apiEndpoint",
            })) as string;
          } catch (endpointError) {
            console.error(`[MyServicesContext] Error fetching API endpoint for ${contractAddress}:`, endpointError);
            serviceDetail.apiEndpoint = "";
          }

          if (serviceDetail.bondingCurveAddress) {
            console.log("[MyServicesContext] Fetching market cap for BC:", serviceDetail.bondingCurveAddress);
            const marketCapData = await fetchAndCalculateMarketCap(
              publicClient,
              serviceDetail.bondingCurveAddress
            );
            if (marketCapData) {
              serviceDetail = { ...serviceDetail, ...marketCapData };
            }
          } else {
            console.log("[MyServicesContext] No bonding curve address for contract:", contractAddress);
          }
          return serviceDetail as ProviderServiceDetails;
        } catch (error) {
          console.error(
            `[MyServicesContext] Error fetching details for contract ${contractAddress}:`,
            error
          );
          return {
            providerContractAddress: contractAddress,
            isActive: false,
          } as ProviderServiceDetails;
        }
      });

      const resolvedContractDetails = await Promise.all(contractDetailsPromises);
      setServices(resolvedContractDetails.filter(details => details !== null) as ProviderServiceDetails[]);
      console.log("[MyServicesContext] Processed services with market cap data:", services);
      setIsLoading(false);
    } catch (error) {
      console.error("[MyServicesContext] Error fetching provider contracts:", error);
      setError("Failed to load your services. Please try again later.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderContracts();
  }, [address, publicClient]);

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
