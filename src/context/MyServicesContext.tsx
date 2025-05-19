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

// Define batching constants
const SERVICE_DETAILS_BATCH_SIZE = 3;
const DELAY_BETWEEN_SERVICE_DETAILS_BATCHES = 1000; // 1 second

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

      if (contractAddresses.length === 0) {
        setServices([]);
        setIsLoading(false);
        return;
      }

      const allServiceDetails: ProviderServiceDetails[] = [];

      for (let i = 0; i < contractAddresses.length; i += SERVICE_DETAILS_BATCH_SIZE) {
        const batchAddresses = contractAddresses.slice(i, i + SERVICE_DETAILS_BATCH_SIZE);
        console.log(
          `[MyServicesContext] Processing batch ${
            Math.floor(i / SERVICE_DETAILS_BATCH_SIZE) + 1
          } of service details (${batchAddresses.length} contracts)`
        );

        const batchPromises = batchAddresses.map(async (contractAddress) => {
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
            const maxEscrowResult = await getContractMaxEscrow(
              publicClient,
              contractAddress
            );
            serviceDetail.maxEscrow = maxEscrowResult === null ? undefined : maxEscrowResult;
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
              console.error(
                `[MyServicesContext] Error fetching API endpoint for ${contractAddress}:`,
                endpointError
              );
              serviceDetail.apiEndpoint = ""; // Default or indicate error
            }

            if (serviceDetail.bondingCurveAddress) {
              console.log(
                "[MyServicesContext] Fetching market cap for BC:",
                serviceDetail.bondingCurveAddress
              );
              const marketCapData = await fetchAndCalculateMarketCap(
                publicClient,
                serviceDetail.bondingCurveAddress
              );
              if (marketCapData) {
                // Explicitly assign fields from marketCapData
                // This ensures that if a field is not in marketCapData (e.g. marketCap itself is optional),
                // it will be set to undefined on serviceDetail if it was previously something else.
                serviceDetail.marketCap = marketCapData.marketCap;
                serviceDetail.tokenPriceInCordex = marketCapData.tokenPriceInCordex;
                serviceDetail.tokenTotalSupply = marketCapData.tokenTotalSupply;
                serviceDetail.actualProviderTokenAddress = marketCapData.actualProviderTokenAddress;
                serviceDetail.tokenDecimals = marketCapData.tokenDecimals;
              } else {
                // Explicitly ensure market cap related fields are undefined if marketCapData is null
                serviceDetail.marketCap = undefined;
                serviceDetail.tokenPriceInCordex = undefined;
                serviceDetail.tokenTotalSupply = undefined;
                serviceDetail.actualProviderTokenAddress = undefined;
                serviceDetail.tokenDecimals = undefined;
              }
            } else {
              console.log(
                "[MyServicesContext] No bonding curve address for contract:",
                contractAddress
              );
              // Ensure market cap fields are undefined or not set
              serviceDetail.marketCap = undefined;
              serviceDetail.tokenPriceInCordex = undefined;
              serviceDetail.tokenTotalSupply = undefined;
              serviceDetail.actualProviderTokenAddress = undefined;
              serviceDetail.tokenDecimals = undefined;
            }
            return serviceDetail as ProviderServiceDetails;
          } catch (error) {
            console.error(
              `[MyServicesContext] Error fetching details for contract ${contractAddress}:`,
              error
            );
            // Return minimal data in case of error for a specific contract
            return {
              providerContractAddress: contractAddress,
              isActive: false, // Or a more specific error state if needed
            } as ProviderServiceDetails;
          }
        });

        const resolvedBatchDetails = await Promise.all(batchPromises.map(p => p.catch(e => {
            console.error("[MyServicesContext] Critical error in batch promise:", e);
            // Potentially return a placeholder or null to filter out later
            // For now, this will propagate as an error in one of the items
            return null; 
        })));
        
        // Filter out nulls if any promise in the batch critically failed and returned null
        const validBatchDetails = resolvedBatchDetails.filter(details => details !== null) as ProviderServiceDetails[];
        allServiceDetails.push(...validBatchDetails);

        // Update state progressively after each batch
        setServices([...allServiceDetails]);

        if (i + SERVICE_DETAILS_BATCH_SIZE < contractAddresses.length) {
          console.log(
            `[MyServicesContext] Waiting ${DELAY_BETWEEN_SERVICE_DETAILS_BATCHES}ms before next service details batch...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_SERVICE_DETAILS_BATCHES)
          );
        }
      }

      // Final state update with all services, though it might be redundant if progressively updated
      // setServices(allServiceDetails); 
      // No, the progressive update inside the loop is sufficient.
      console.log(
        "[MyServicesContext] All provider contracts processed:",
        allServiceDetails
      );
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
