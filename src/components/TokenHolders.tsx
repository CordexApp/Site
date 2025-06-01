"use client";

import { CopyableHash } from "@/components/ui/CopyableHash";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { useCallback, useEffect, useState } from "react";
import { createPublicClient, formatUnits, http } from "viem";
import { optimismSepolia } from "viem/chains";

interface BlockscoutTokenHolder {
  address: {
    hash: string;
  };
  value: string;
}

interface BlockscoutTokenHoldersResponse {
  items: BlockscoutTokenHolder[];
  next_page_params: any;
}

interface ProcessedTokenHolder {
  address: string;
  balance: string;
  balanceFormatted: number;
  percentage: number;
}

interface TokenHoldersProps {
  tokenAddress: `0x${string}` | null;
  tokenSymbol?: string;
  bondingCurveAddress?: `0x${string}` | null;
}

// Create a public client for reading blockchain data
const publicClient = createPublicClient({
  chain: optimismSepolia,
  transport: http()
});

// ERC20 ABI for getting total supply and decimals
const erc20Abi = [
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;

export default function TokenHolders({ tokenAddress, tokenSymbol, bondingCurveAddress }: TokenHoldersProps) {
  const [holdersData, setHoldersData] = useState<ProcessedTokenHolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualTokenSymbol, setActualTokenSymbol] = useState<string | null>(null);

  // Add debug logging
  useEffect(() => {
    console.log("[TokenHolders] Component initialized with:", {
      tokenAddress,
      tokenSymbol,
      bondingCurveAddress,
      hasValidAddress: tokenAddress && tokenAddress.length === 42 && tokenAddress.startsWith('0x')
    });
    
    if (bondingCurveAddress) {
      console.log("[TokenHolders] Will look for bonding curve address:", bondingCurveAddress);
    } else {
      console.log("[TokenHolders] No bonding curve address provided");
    }
  }, [tokenAddress, tokenSymbol, bondingCurveAddress]);

  const fetchTokenInfo = useCallback(async (address: `0x${string}`) => {
    try {
      // Get total supply, decimals, and symbol from the contract
      const [totalSupplyResult, decimalsResult, symbolResult] = await Promise.all([
        publicClient.readContract({
          address,
          abi: erc20Abi,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
      ]);

      // Set the actual token symbol from the contract
      setActualTokenSymbol(symbolResult as string);

      return { totalSupply: totalSupplyResult, decimals: decimalsResult, symbol: symbolResult };
    } catch (error) {
      console.error("Error fetching token info:", error);
      // Use defaults and fallback symbol
      setActualTokenSymbol(tokenSymbol || 'TOKEN');
      return { totalSupply: 1000000000000000000000000n, decimals: 18, symbol: tokenSymbol || 'TOKEN' };
    }
  }, [tokenSymbol]);

  const fetchTokenHolders = useCallback(async () => {
    if (!tokenAddress) {
      console.log("[TokenHolders] No token address provided, skipping fetch");
      return;
    }

    // Validate token address format
    if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
      setError(`Invalid token address format: ${tokenAddress}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get token info
      const tokenInfo = await fetchTokenInfo(tokenAddress);
      
      // Fetch from Blockscout Optimism Sepolia API
      const blockscoutUrl = `https://optimism-sepolia.blockscout.com/api/v2/tokens/${tokenAddress}/holders`;
      console.log("[TokenHolders] Fetching from Blockscout API:", blockscoutUrl);
      console.log("[TokenHolders] Token address being used:", tokenAddress);
      
      const response = await fetch(blockscoutUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Token not indexed yet - This token hasn't been indexed by Blockscout yet. Token holder data will be available once the indexing is complete, which may take some time for newly deployed tokens.");
          return;
        } else {
          throw new Error(`Blockscout API request failed: ${response.status} ${response.statusText}`);
        }
      }

      const data: BlockscoutTokenHoldersResponse = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Invalid response format from Blockscout API");
      }

      // Process the holder data
      const processedHolders: ProcessedTokenHolder[] = data.items.map(holder => {
        const balanceBigInt = BigInt(holder.value);
        const balanceFormatted = parseFloat(formatUnits(balanceBigInt, tokenInfo.decimals));
        const totalSupplyFormatted = parseFloat(formatUnits(tokenInfo.totalSupply, tokenInfo.decimals));
        const percentage = totalSupplyFormatted > 0 ? (balanceFormatted / totalSupplyFormatted) * 100 : 0;

        return {
          address: holder.address.hash,
          balance: holder.value,
          balanceFormatted,
          percentage,
        };
      });

      // Sort by balance (highest first)
      processedHolders.sort((a, b) => b.balanceFormatted - a.balanceFormatted);

      setHoldersData(processedHolders);
      console.log(`[TokenHolders] ✅ Fetched ${processedHolders.length} holders from Blockscout`);

    } catch (err) {
      console.error("[TokenHolders] Error fetching token holders:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to fetch token holders: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, fetchTokenInfo]);

  useEffect(() => {
    if (tokenAddress) {
      fetchTokenHolders();
    }
  }, [tokenAddress, fetchTokenHolders]);

  const handleRefresh = () => {
    fetchTokenHolders();
  };

  if (!tokenAddress) {
    return (
      <div className="mt-8 p-4 border border-gray-700 rounded-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Token Holders {tokenSymbol && `(${tokenSymbol})`}
          </h3>
        </div>
        <div className="text-gray-400 text-center py-6">
          <div>No token address available</div>
          <div className="text-sm mt-2">
            The service doesn't have a token contract address configured yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 ml-auto max-w-md w-full p-3 border border-gray-800 rounded bg-gray-900/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">
          Token Holders {actualTokenSymbol && `(${actualTokenSymbol})`}
        </h3>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-400 disabled:text-gray-600"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="py-4">
          <LoadingDots text="Fetching token holders from Blockscout..." />
        </div>
      )}

      {error && (
        <div className="text-yellow-400 text-xs p-2 bg-yellow-900/10 border border-yellow-800 rounded">
          <div className="font-medium mb-1">
            {error.startsWith("Token not indexed yet") ? "Token Not Indexed Yet" : "Error"}
          </div>
          <div className="text-yellow-300">
            {error.startsWith("Token not indexed yet") 
              ? "This token hasn't been indexed by Blockscout yet. Token holder data will be available once the indexing is complete, which may take some time for newly deployed tokens."
              : error
            }
          </div>
          <div className="mt-1 text-xs text-yellow-200">
            The token contract exists and is functional, but Blockscout's indexing service hasn't processed it yet.
            You can still interact with the token normally.
          </div>
        </div>
      )}

      {!loading && !error && holdersData.length === 0 && (
        <div className="text-gray-500 text-center py-4">
          <div className="text-sm">No token holders found.</div>
          <div className="text-xs mt-1">
            This token may have no transfers yet, or Blockscout may not have indexed it.
          </div>
          <button
            onClick={handleRefresh}
            className="mt-2 text-blue-500 hover:text-blue-400 text-xs underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && holdersData.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
            <span>{holdersData.length} holders</span>
            <span className="text-xs">Live data</span>
          </div>
          
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {holdersData.map((holder, index) => {
              const isBondingCurve = bondingCurveAddress && 
                holder.address.toLowerCase() === bondingCurveAddress.toLowerCase();
              
              // Debug logging for bonding curve detection
              if (bondingCurveAddress) {
                console.log(`[TokenHolders] Comparing holder ${index + 1}:`, {
                  holderAddress: holder.address.toLowerCase(),
                  bondingCurveAddress: bondingCurveAddress.toLowerCase(),
                  isMatch: isBondingCurve
                });
              }
              
              return (
                <div
                  key={holder.address}
                  className="flex items-center justify-between p-2 bg-gray-800/50 rounded border border-gray-700/50"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 font-mono min-w-[20px]">
                      #{index + 1}
                    </span>
                    <div className="flex flex-col">
                      <CopyableHash 
                        hash={holder.address as `0x${string}`}
                        className="text-xs"
                      />
                      {isBondingCurve && (
                        <span className="text-xs text-blue-400 mt-0.5">
                          (bonding curve)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-300">
                      {holder.balanceFormatted.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 0,
                      })} {actualTokenSymbol || 'tokens'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {holder.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 