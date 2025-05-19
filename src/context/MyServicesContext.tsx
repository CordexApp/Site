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

      // First, fetch services for the connected user from the database
      console.log(`[MyServicesContext] Fetching services for user ${address} from database`);
      const userDatabaseServicesResponse = await getServicesByOwnerOrAll(address); // No limit/offset, get all for user
      const userDatabaseServices = userDatabaseServicesResponse.services;
      console.log(`[MyServicesContext] Fetched ${userDatabaseServices.length} (total in DB for user: ${userDatabaseServicesResponse.total_count}) services from database for user ${address}`);
      
      // Create a map of normalized contract addresses to service names for efficient lookup
      const contractToServiceMap = new Map<string, string>();
      userDatabaseServices.forEach(service => {
        if (service.provider_contract_address) {
          const normalizedAddress = service.provider_contract_address.toLowerCase();
          contractToServiceMap.set(normalizedAddress, service.name);
          console.log(`[MyServicesContext] Mapped ${normalizedAddress} to name "${service.name}"`);
        }
      });

      const providerContractsData = await publicClient.readContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: "getProviderContracts",
        args: [address],
      });

      const contractAddresses = providerContractsData as `0x${string}`[];
      console.log("[MyServicesContext] Found provider contracts:", contractAddresses);

      // Prepare initial service structures for progressive loading display
      // These will be filled with more details progressively.
      const initialServiceHolders = contractAddresses.map(addr => ({
        providerContractAddress: addr,
        isActive: false, // Default, will be updated by checkContractActive
        serviceName: contractToServiceMap.get(addr.toLowerCase()) || generateFriendlyName(addr), // Use DB name or generate temp
        // Other fields will be undefined initially
      })) as ProviderServiceDetails[];
      
      setServices(initialServiceHolders);
      setIsLoading(false); // <<< Key change: Set loading to false early

      if (contractAddresses.length === 0) {
        // No further processing needed if no contracts
        return;
      }

      // This will hold the progressively detailed services, starting with initial holders
      let progressivelyDetailedServices = [...initialServiceHolders];

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

            // Look up the service name in our pre-fetched map
            const normalizedAddress = contractAddress.toLowerCase();
            if (contractToServiceMap.has(normalizedAddress)) {
              const name = contractToServiceMap.get(normalizedAddress);
              serviceDetail.serviceName = name;
              console.log(`[MyServicesContext] Found name "${name}" for ${contractAddress} in pre-fetched data`);
            } else {
              console.log(`[MyServicesContext] No service name found for ${contractAddress} in pre-fetched data`);
              
              // Generate a friendly name based on API endpoint or address
              serviceDetail.serviceName = generateFriendlyName(contractAddress, serviceDetail.apiEndpoint);
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
                serviceDetail.marketCap = marketCapData.marketCap;
                serviceDetail.tokenPriceInCordex = marketCapData.tokenPriceInCordex;
                serviceDetail.tokenTotalSupply = marketCapData.tokenTotalSupply;
                serviceDetail.actualProviderTokenAddress = marketCapData.actualProviderTokenAddress;
                serviceDetail.tokenDecimals = marketCapData.tokenDecimals;

                // If marketCapData includes actualProviderTokenAddress and tokenDecimals, fetch user balance
                if (marketCapData.actualProviderTokenAddress && typeof marketCapData.tokenDecimals === 'number' && address) {
                  try {
                    const balanceRaw = await publicClient.readContract({
                      address: marketCapData.actualProviderTokenAddress,
                      abi: erc20Abi,
                      functionName: 'balanceOf',
                      args: [address],
                    });
                    serviceDetail.userTokenBalanceRaw = balanceRaw as bigint;
                    // Format balance (example, assuming ethers.utils.formatUnits or similar)
                    // For now, just store raw or a simple string. Formatting can be done in component or with a util.
                    const formattedBalance = (Number(balanceRaw) / Math.pow(10, marketCapData.tokenDecimals)).toFixed(4);
                    serviceDetail.userTokenBalance = formattedBalance;
                    console.log(`[MyServicesContext] User ${address} balance for ${marketCapData.actualProviderTokenAddress}: ${formattedBalance}`);
                  } catch (balanceError) {
                    console.error(`[MyServicesContext] Error fetching user balance for ${marketCapData.actualProviderTokenAddress}:`, balanceError);
                    serviceDetail.userTokenBalanceRaw = 0n;
                    serviceDetail.userTokenBalance = "0.0000";
                  }
                }
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
              serviceName: generateFriendlyName(contractAddress)
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
        
        // Update the progressivelyDetailedServices array with new details from this batch
        validBatchDetails.forEach(detailedService => {
          const indexToUpdate = progressivelyDetailedServices.findIndex(
            s => s.providerContractAddress.toLowerCase() === detailedService.providerContractAddress.toLowerCase()
          );
          if (indexToUpdate !== -1) {
            progressivelyDetailedServices[indexToUpdate] = detailedService;
          } else {
            // This case should ideally not happen if batchAddresses are derived from contractAddresses
            // and progressivelyDetailedServices was initialized from contractAddresses.
            // However, as a fallback, we could add it if it's somehow missing.
            // progressivelyDetailedServices.push(detailedService); 
            console.warn("[MyServicesContext] Detailed service not found in progressivelyDetailedServices array for update:", detailedService.providerContractAddress);
          }
        });

        // Update state progressively after each batch, using the updated master list
        setServices([...progressivelyDetailedServices]);

        if (i + SERVICE_DETAILS_BATCH_SIZE < contractAddresses.length) {
          console.log(
            `[MyServicesContext] Waiting ${DELAY_BETWEEN_SERVICE_DETAILS_BATCHES}ms before next service details batch...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_SERVICE_DETAILS_BATCHES)
          );
        }
      }

      console.log(
        "[MyServicesContext] All provider contracts processed:",
        progressivelyDetailedServices // Log the final detailed list
      );
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

// Helper function to generate a friendly name
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
