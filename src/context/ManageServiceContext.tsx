"use client";

import { ERC20Abi } from "@/abis/ERC20";
import { getBondingCurveContract } from "@/services/bondingCurveServices";
import {
    checkContractActive,
    getContractMaxEscrow,
    getContractProvider,
} from "@/services/contractServices";
import { getServiceByContractAddress } from "@/services/servicesService";
import { Service } from "@/types/service";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

// Define provider contract details type
interface ProviderContractDetails {
  isActive: boolean;
  apiEndpoint?: string;
  maxEscrow?: string;
}

// Define token info type
interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

// Define context type
interface ManageServiceContextType {
  isLoading: boolean;
  error: string | null;
  service: Service | null;
  providerContractAddress: `0x${string}` | null;
  ownerAddress: `0x${string}` | null;
  providerContractDetails: ProviderContractDetails | null;
  providerTokenAddress: `0x${string}` | null;
  providerTokenInfo: TokenInfo | null;
  bondingCurveAddress: `0x${string}` | null;
  refreshData: () => void;
}

// Create context
const ManageServiceContext = createContext<ManageServiceContextType | undefined>(
  undefined
);

// Provider component
export function ManageServiceProvider({
  children,
  serviceAddress,
}: {
  children: ReactNode;
  serviceAddress: `0x${string}`;
}) {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [providerContractAddress, setProviderContractAddress] = useState<`0x${string}` | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<`0x${string}` | null>(null);
  const [providerContractDetails, setProviderContractDetails] = useState<ProviderContractDetails | null>(null);
  const [providerTokenAddress, setProviderTokenAddress] = useState<`0x${string}` | null>(null);
  const [providerTokenInfo, setProviderTokenInfo] = useState<TokenInfo | null>(null);
  const [bondingCurveAddress, setBondingCurveAddress] = useState<`0x${string}` | null>(null);

  // Function to fetch all service data
  const fetchServiceData = async () => {
    if (!publicClient || !serviceAddress) {
      setError("Web3 client not available or no service address provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Set provider contract address
      setProviderContractAddress(serviceAddress);

      // Get provider address (owner)
      const provider = await getContractProvider(publicClient, serviceAddress);
      if (provider) {
        setOwnerAddress(provider);
      }

      // Get contract details
      const isActive = await checkContractActive(publicClient, serviceAddress);
      const maxEscrow = await getContractMaxEscrow(publicClient, serviceAddress);

      // Get API endpoint
      let apiEndpoint: string | undefined;
      try {
        apiEndpoint = await publicClient.readContract({
          address: serviceAddress,
          abi: [
            {
              inputs: [],
              name: "apiEndpoint",
              outputs: [{ name: "", type: "string" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "apiEndpoint",
        }) as string;
      } catch (e) {
        console.error("Error fetching API endpoint:", e);
      }

      setProviderContractDetails({
        isActive,
        maxEscrow,
        apiEndpoint,
      });

      // Get service from database
      const serviceData = await getServiceByContractAddress(serviceAddress);
      if (serviceData) {
        setService(serviceData);
      }

      // Get provider token address
      try {
        const tokenAddress = await publicClient.readContract({
          address: serviceAddress,
          abi: [
            {
              inputs: [],
              name: "tokenAddress",
              outputs: [{ name: "", type: "address" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "tokenAddress",
        }) as `0x${string}`;

        if (tokenAddress !== "0x0000000000000000000000000000000000000000") {
          setProviderTokenAddress(tokenAddress);

          // Get token info
          const [name, symbol, decimals, totalSupply] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC20Abi,
              functionName: "name",
            }),
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC20Abi,
              functionName: "symbol",
            }),
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC20Abi,
              functionName: "decimals",
            }),
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC20Abi,
              functionName: "totalSupply",
            }),
          ]);

          setProviderTokenInfo({
            name: name as string,
            symbol: symbol as string,
            decimals: decimals as number,
            totalSupply: (totalSupply as bigint).toString(),
          });
        }
      } catch (e) {
        console.error("Error fetching token info:", e);
      }

      // Get bonding curve address
      const bondingCurve = await getBondingCurveContract(publicClient, serviceAddress);
      if (bondingCurve) {
        setBondingCurveAddress(bondingCurve);
      }
    } catch (err) {
      console.error("Error fetching service data:", err);
      setError(err instanceof Error ? err.message : "Failed to load service data");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchServiceData();
  }, [serviceAddress, publicClient, walletAddress]);

  const value: ManageServiceContextType = {
    isLoading,
    error,
    service,
    providerContractAddress,
    ownerAddress,
    providerContractDetails,
    providerTokenAddress,
    providerTokenInfo,
    bondingCurveAddress,
    refreshData: fetchServiceData,
  };

  return (
    <ManageServiceContext.Provider value={value}>
      {children}
    </ManageServiceContext.Provider>
  );
}

// Custom hook to use the context
export function useManageService() {
  const context = useContext(ManageServiceContext);
  if (!context) {
    throw new Error("useManageService must be used within a ManageServiceProvider");
  }
  return context;
} 