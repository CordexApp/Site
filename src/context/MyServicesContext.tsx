"use client";

import { ProviderContractAbi } from "@/abis/ProviderContract";
import {
  getBondingCurveContract,
} from "@/services/bondingCurveServices";
import {
  checkContractActive,
  getContractMaxEscrow,
  getContractProvider
} from "@/services/contractServices";
import { getServicesByOwnerOrAll } from "@/services/servicesService";
import { fetchAndCalculateMarketCap, MarketCapDetails } from "@/utils/marketCapUtils";
import React, { createContext, useContext, useEffect, useState } from "react";
import { erc20Abi } from "viem";
import { useAccount, usePublicClient } from "wagmi";

// Define the shape of a service/contract
export type ProviderServiceDetails = {
  providerContractAddress: `0x${string}`;
  isActive: boolean;
  apiEndpoint?: string;
  maxEscrow?: string;
  providerAddress?: `0x${string}` | null;
  bondingCurveAddress?: `0x${string}` | null;
  serviceName?: string;
  userTokenBalance?: string; // Formatted balance for display
  userTokenBalanceRaw?: bigint; // Raw balance for calculations
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

  // Function to fetch services for the connected wallet from the database only
  const fetchServicesFromDatabase = async () => {
    if (!address || !publicClient) {
      setServices([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch services for the connected user from the database
      console.log(`[MyServicesContext] Fetching services for user ${address} from database`);
      const userDatabaseServicesResponse = await getServicesByOwnerOrAll(address);
      const userDatabaseServices = userDatabaseServicesResponse.services;
      console.log(`[MyServicesContext] Fetched ${userDatabaseServices.length} services from database for user ${address}`);
      
      if (userDatabaseServices.length === 0) {
        setServices([]);
        setIsLoading(false);
        return;
      }

      // Filter services that have provider contract addresses
      const servicesWithContracts = userDatabaseServices.filter(service => 
        service.provider_contract_address
      );

      if (servicesWithContracts.length === 0) {
        setServices([]);
        setIsLoading(false);
        return;
      }

      // Create initial service structures for progressive loading display
      const initialServiceHolders = servicesWithContracts.map(service => ({
        providerContractAddress: service.provider_contract_address as `0x${string}`,
        isActive: false, // Default, will be updated by checkContractActive
        serviceName: service.name,
        apiEndpoint: service.endpoint,
        bondingCurveAddress: service.bonding_curve_address as `0x${string}` || undefined,
      })) as ProviderServiceDetails[];
      
      setServices(initialServiceHolders);
      setIsLoading(false); // Set loading to false early to show initial data

      // This will hold the progressively detailed services, starting with initial holders
      let progressivelyDetailedServices = [...initialServiceHolders];

      // Process services in batches to get detailed blockchain information
      for (let i = 0; i < servicesWithContracts.length; i += SERVICE_DETAILS_BATCH_SIZE) {
        const batchServices = servicesWithContracts.slice(i, i + SERVICE_DETAILS_BATCH_SIZE);
        console.log(
          `[MyServicesContext] Processing batch ${
            Math.floor(i / SERVICE_DETAILS_BATCH_SIZE) + 1
          } of service details (${batchServices.length} services)`
        );

        const batchPromises = batchServices.map(async (dbService) => {
          const contractAddress = dbService.provider_contract_address as `0x${string}`;
          
          let serviceDetail: Partial<ProviderServiceDetails> = {
            providerContractAddress: contractAddress,
            isActive: false,
            serviceName: dbService.name,
            apiEndpoint: dbService.endpoint,
          };
          
          try {
            // Get contract details from blockchain
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

            // Get bonding curve address from database first, then from contract if not available
            if (dbService.bonding_curve_address) {
              serviceDetail.bondingCurveAddress = dbService.bonding_curve_address as `0x${string}`;
            } else {
              serviceDetail.bondingCurveAddress = await getBondingCurveContract(
                publicClient,
                contractAddress
              );
            }

            // Try to get API endpoint from contract (might be more up-to-date than DB)
            try {
              const contractApiEndpoint = (await publicClient.readContract({
                address: contractAddress,
                abi: ProviderContractAbi,
                functionName: "apiEndpoint",
              })) as string;
              
              // Use contract endpoint if it exists and is different from DB
              if (contractApiEndpoint && contractApiEndpoint !== dbService.endpoint) {
                serviceDetail.apiEndpoint = contractApiEndpoint;
              }
            } catch (endpointError) {
              console.error(
                `[MyServicesContext] Error fetching API endpoint for ${contractAddress}:`,
                endpointError
              );
              // Keep the DB endpoint as fallback
              serviceDetail.apiEndpoint = dbService.endpoint;
            }

            // Fetch market cap data if bonding curve exists
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
                // Assign market cap fields
                serviceDetail.marketCap = marketCapData.marketCap;
                serviceDetail.tokenPriceInCordex = marketCapData.tokenPriceInCordex;
                serviceDetail.tokenTotalSupply = marketCapData.tokenTotalSupply;
                serviceDetail.actualProviderTokenAddress = marketCapData.actualProviderTokenAddress;
                serviceDetail.tokenDecimals = marketCapData.tokenDecimals;

                // Fetch user token balance
                if (marketCapData.actualProviderTokenAddress && typeof marketCapData.tokenDecimals === 'number' && address) {
                  try {
                    const balanceRaw = await publicClient.readContract({
                      address: marketCapData.actualProviderTokenAddress,
                      abi: erc20Abi,
                      functionName: 'balanceOf',
                      args: [address],
                    });
                    serviceDetail.userTokenBalanceRaw = balanceRaw as bigint;
                    const formattedBalance = (Number(balanceRaw) / Math.pow(10, marketCapData.tokenDecimals)).toFixed(4);
                    serviceDetail.userTokenBalance = formattedBalance;
                    console.log(`[MyServicesContext] User ${address} balance for ${marketCapData.actualProviderTokenAddress}: ${formattedBalance}`);
                  } catch (balanceError) {
                    console.error(`[MyServicesContext] Error fetching user balance for ${marketCapData.actualProviderTokenAddress}:`, balanceError);
                    serviceDetail.userTokenBalanceRaw = 0n;
                    serviceDetail.userTokenBalance = "0.0000";
                  }
                }
              }
            } else {
              console.log(
                "[MyServicesContext] No bonding curve address for service:",
                dbService.name
              );
            }
            
            return serviceDetail as ProviderServiceDetails;
          } catch (error) {
            console.error(
              `[MyServicesContext] Error fetching details for service ${dbService.name} (${contractAddress}):`,
              error
            );
            // Return minimal data in case of error for a specific service
            return {
              providerContractAddress: contractAddress,
              isActive: false,
              serviceName: dbService.name,
              apiEndpoint: dbService.endpoint,
            } as ProviderServiceDetails;
          }
        });

        const resolvedBatchDetails = await Promise.all(batchPromises.map(p => p.catch(e => {
            console.error("[MyServicesContext] Critical error in batch promise:", e);
            return null; 
        })));
        
        // Filter out nulls if any promise in the batch critically failed and returned null
        const validBatchDetails = resolvedBatchDetails.filter(details => details !== null) as ProviderServiceDetails[];
        
        // Update the progressivelyDetailedServices array with new details from this batch
        validBatchDetails.forEach(detailedService => {
          const indexToUpdate = progressivelyDetailedServices.findIndex(
            s => s.providerContractAddress.toLowerCase() === detailedService.providerContractAddress.toLowerCase()
          );
          if (indexToUpdate !== -1) {
            progressivelyDetailedServices[indexToUpdate] = detailedService;
          } else {
            console.warn("[MyServicesContext] Detailed service not found in progressivelyDetailedServices array for update:", detailedService.providerContractAddress);
          }
        });

        // Update state progressively after each batch
        setServices([...progressivelyDetailedServices]);

        if (i + SERVICE_DETAILS_BATCH_SIZE < servicesWithContracts.length) {
          console.log(
            `[MyServicesContext] Waiting ${DELAY_BETWEEN_SERVICE_DETAILS_BATCHES}ms before next service details batch...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_SERVICE_DETAILS_BATCHES)
          );
        }
      }

      console.log(
        "[MyServicesContext] All services processed:",
        progressivelyDetailedServices
      );
    } catch (error) {
      console.error("[MyServicesContext] Error fetching services:", error);
      setError("Failed to load your services. Please try again later.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesFromDatabase();
  }, [address, publicClient]);

  const value = {
    isLoading,
    error,
    services,
    refreshServices: fetchServicesFromDatabase,
  };

  return (
    <MyServicesContext.Provider value={value}>
      {children}
    </MyServicesContext.Provider>
  );
};

// Helper function to generate a friendly name (kept for compatibility, but not used anymore)
function generateFriendlyName(contractAddress: string, apiEndpoint?: string): string {
  if (apiEndpoint) {
    try {
      // Try to parse the URL and get hostname parts
      const url = new URL(apiEndpoint);
      const hostParts = url.hostname.split('.');
      
      // Get the subdomain or first part of the hostname
      const apiHost = hostParts[0] !== 'www' ? hostParts[0] : hostParts[1];
      
      if (apiHost && apiHost !== 'localhost' && apiHost !== '127.0.0.1') {
        // Capitalize the first letter and make a friendly name
        return apiHost.charAt(0).toUpperCase() + apiHost.slice(1) + ' Service';
      }
    } catch (e) {
      // URL parsing failed, try simple string splitting
      const parts = apiEndpoint.split('//');
      if (parts.length > 1) {
        const hostPart = parts[1].split('/')[0].split('.')[0];
        if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
          return hostPart.charAt(0).toUpperCase() + hostPart.slice(1) + ' Service';
        }
      }
    }
  }
  
  // If no API endpoint or parsing failed, use the last 6 chars of contract address
  const lastSix = contractAddress.substring(contractAddress.length - 6);
  return `My Service ${lastSix}`;
}
