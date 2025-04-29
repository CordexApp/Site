"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { usePublicClient } from "wagmi";
import {
  getContractProvider,
  checkContractActive,
  getContractMaxEscrow,
} from "@/services/contractServices";
import {
  getProviderTokensForWallet,
  getBondingCurveContract,
  findBondingCurveForProviderToken,
} from "@/services/bondingCurveServices";

// Define the state interface for ManageServiceContext
export interface ManageServiceState {
  isLoading: boolean;
  error: string | null;
  providerContractAddress: `0x${string}`;
  ownerAddress: `0x${string}` | null;
  providerContractDetails: {
    isActive: boolean;
    apiEndpoint: string | null;
    maxEscrow: bigint;
  } | null;
  providerTokenAddress: `0x${string}` | null;
  providerTokenInfo: {
    name: string;
    symbol: string;
  } | null;
  bondingCurveAddress: `0x${string}` | null;
  bondingCurveDetails: {
    m: bigint;
    b: bigint;
    tokenSupply: bigint;
    accumulatedFees: bigint;
  } | null;
}

interface ManageServiceContextType extends ManageServiceState {
  refreshData: () => Promise<void>;
}

const ManageServiceContext = createContext<
  ManageServiceContextType | undefined
>(undefined);

export function ManageServiceProvider({
  children,
  serviceAddress,
}: {
  children: ReactNode;
  serviceAddress: `0x${string}`;
}) {
  const [state, setState] = useState<ManageServiceState>({
    isLoading: true,
    error: null,
    providerContractAddress: serviceAddress,
    ownerAddress: null,
    providerContractDetails: null,
    providerTokenAddress: null,
    providerTokenInfo: null,
    bondingCurveAddress: null,
    bondingCurveDetails: null,
  });

  const publicClient = usePublicClient();

  const fetchData = async () => {
    if (!publicClient) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Get the owner address from the provider contract
      const ownerAddress = await getContractProvider(
        publicClient,
        state.providerContractAddress
      );

      if (!ownerAddress) {
        throw new Error("Failed to get contract owner");
      }

      // Step 2: Get associated contract addresses from factory
      const providerTokens = await getProviderTokensForWallet(
        publicClient,
        ownerAddress
      );
      const providerTokenAddress =
        providerTokens.length > 0
          ? providerTokens[providerTokens.length - 1]
          : null;

      let bondingCurveAddress = null;
      if (providerTokenAddress) {
        bondingCurveAddress = await findBondingCurveForProviderToken(
          publicClient,
          ownerAddress,
          providerTokenAddress
        );
      }

      // Step 3: Fetch details from each contract in parallel
      const [isActive, maxEscrow] = await Promise.all([
        checkContractActive(publicClient, state.providerContractAddress),
        getContractMaxEscrow(publicClient, state.providerContractAddress),
      ]);

      // Try to get API endpoint
      let apiEndpoint = null;
      try {
        const apiEndpointResult = await publicClient.readContract({
          address: state.providerContractAddress,
          abi: [
            {
              name: "apiEndpoint",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "", type: "string" }],
            },
          ],
          functionName: "apiEndpoint",
        });
        apiEndpoint = apiEndpointResult ? String(apiEndpointResult) : null;
      } catch (err) {
        console.error("Failed to fetch API endpoint:", err);
      }

      // Get token info if we have a token address
      let tokenInfo = null;
      if (providerTokenAddress) {
        try {
          const nameResult = await publicClient.readContract({
            address: providerTokenAddress,
            abi: [
              {
                name: "name",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "string" }],
              },
            ],
            functionName: "name",
          });

          const symbolResult = await publicClient.readContract({
            address: providerTokenAddress,
            abi: [
              {
                name: "symbol",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "string" }],
              },
            ],
            functionName: "symbol",
          });

          tokenInfo = {
            name: nameResult ? String(nameResult) : "",
            symbol: symbolResult ? String(symbolResult) : "",
          };
        } catch (err) {
          console.error("Failed to fetch token info:", err);
        }
      }

      // Get bonding curve details if we have an address
      let bondingCurveDetails = null;
      if (bondingCurveAddress) {
        try {
          const mResult = await publicClient.readContract({
            address: bondingCurveAddress,
            abi: [
              {
                name: "m",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "m",
          });

          const bResult = await publicClient.readContract({
            address: bondingCurveAddress,
            abi: [
              {
                name: "b",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "b",
          });

          const tokenSupplyResult = await publicClient.readContract({
            address: bondingCurveAddress,
            abi: [
              {
                name: "tokenSupply",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "tokenSupply",
          });

          const accumulatedFeesResult = await publicClient.readContract({
            address: bondingCurveAddress,
            abi: [
              {
                name: "accumulatedFees",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "accumulatedFees",
          });

          bondingCurveDetails = {
            m: BigInt(mResult || 0),
            b: BigInt(bResult || 0),
            tokenSupply: BigInt(tokenSupplyResult || 0),
            accumulatedFees: BigInt(accumulatedFeesResult || 0),
          };
        } catch (err) {
          console.error("Failed to fetch bonding curve details:", err);
        }
      }

      // Update state with all fetched data
      setState({
        isLoading: false,
        error: null,
        providerContractAddress: state.providerContractAddress,
        ownerAddress,
        providerContractDetails: {
          isActive,
          apiEndpoint,
          maxEscrow:
            typeof maxEscrow === "string"
              ? BigInt(Math.floor(parseFloat(maxEscrow) * 10 ** 18))
              : BigInt(0),
        },
        providerTokenAddress,
        providerTokenInfo: tokenInfo,
        bondingCurveAddress,
        bondingCurveDetails,
      });
    } catch (error) {
      console.error("Error fetching service data:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }));
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [publicClient, serviceAddress]);

  const value = {
    ...state,
    refreshData: fetchData,
  };

  return (
    <ManageServiceContext.Provider value={value}>
      {children}
    </ManageServiceContext.Provider>
  );
}

export function useManageService() {
  const context = useContext(ManageServiceContext);
  if (context === undefined) {
    throw new Error(
      "useManageService must be used within a ManageServiceProvider"
    );
  }
  return context;
}
