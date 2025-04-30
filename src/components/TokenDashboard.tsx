"use client";

import { useEffect, useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import {
  findBondingCurveForProviderToken,
  getProviderTokensForWallet,
} from "@/services/bondingCurveServices";
import { getContractProvider } from "@/services/contractServices";
import { formatEther } from "viem";

interface TokenDashboardProps {
  providerContractAddress: `0x${string}`;
}

interface TokenInfo {
  address: `0x${string}` | null;
  name: string | null;
  symbol: string | null;
  balance: string | null;
}

export default function TokenDashboard({
  providerContractAddress,
}: TokenDashboardProps) {
  const [ownerAddress, setOwnerAddress] = useState<`0x${string}` | null>(null);
  const [bondingCurveAddress, setBondingCurveAddress] = useState<
    `0x${string}` | null
  >(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    address: null,
    name: null,
    symbol: null,
    balance: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { address: walletAddress } = useAccount();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setOwnerAddress(null);
      setBondingCurveAddress(null);
      setTokenInfo({ address: null, name: null, symbol: null, balance: null });

      try {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        console.log(
          `[TokenDashboard] Fetching data for provider contract: ${providerContractAddress}`
        );

        // Step 1: Get the owner address from the provider contract
        const fetchedOwnerAddress = await getContractProvider(
          publicClient,
          providerContractAddress
        );

        if (!fetchedOwnerAddress) {
          throw new Error(
            `Failed to get contract owner for ${providerContractAddress}`
          );
        }
        setOwnerAddress(fetchedOwnerAddress);
        console.log(
          `[TokenDashboard] Found owner address: ${fetchedOwnerAddress}`
        );

        // Step 2: Get provider tokens associated with the owner from the factory
        const providerTokens = await getProviderTokensForWallet(
          publicClient,
          fetchedOwnerAddress
        );
        console.log(
          `[TokenDashboard] Found provider tokens for owner:`,
          providerTokens
        );

        if (!providerTokens || providerTokens.length === 0) {
          console.log(
            "[TokenDashboard] No provider tokens found for this owner."
          );
          // If no tokens, can't proceed to find token details or bonding curve
          setIsLoading(false);
          return;
        }

        // Select the relevant token (assuming the last one is the most recent/relevant, like in ManageServiceContext)
        const tokenAddress = providerTokens[providerTokens.length - 1];
        console.log(`[TokenDashboard] Selected token address: ${tokenAddress}`);

        // Step 3: Get token details (name, symbol, balance)
        let currentTokenInfo: TokenInfo = {
          address: tokenAddress,
          name: null,
          symbol: null,
          balance: null,
        };

        try {
          console.log(
            `[TokenDashboard] Fetching details for token: ${tokenAddress}`
          );
          const [tokenName, tokenSymbol] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress,
              abi: [
                {
                  name: "name",
                  type: "function",
                  stateMutability: "view",
                  inputs: [],
                  outputs: [{ type: "string", name: "" }],
                },
              ],
              functionName: "name",
            }) as Promise<string>,
            publicClient.readContract({
              address: tokenAddress,
              abi: [
                {
                  name: "symbol",
                  type: "function",
                  stateMutability: "view",
                  inputs: [],
                  outputs: [{ type: "string", name: "" }],
                },
              ],
              functionName: "symbol",
            }) as Promise<string>,
          ]);

          currentTokenInfo.name = tokenName || null;
          currentTokenInfo.symbol = tokenSymbol || null;
          console.log(
            `[TokenDashboard] Token details: Name=${tokenName}, Symbol=${tokenSymbol}`
          );

          if (walletAddress) {
            console.log(
              `[TokenDashboard] Fetching balance for wallet: ${walletAddress}`
            );
            const balanceBigInt = (await publicClient.readContract({
              address: tokenAddress,
              abi: [
                {
                  name: "balanceOf",
                  type: "function",
                  stateMutability: "view",
                  inputs: [{ type: "address", name: "account" }],
                  outputs: [{ type: "uint256", name: "" }],
                },
              ],
              functionName: "balanceOf",
              args: [walletAddress],
            })) as bigint;
            currentTokenInfo.balance = formatEther(balanceBigInt);
            console.log(
              `[TokenDashboard] Wallet balance: ${currentTokenInfo.balance}`
            );
          }
        } catch (err) {
          console.error("[TokenDashboard] Error fetching token details:", err);
          // Keep token address, but mark other details as failed/null
        }

        setTokenInfo(currentTokenInfo);

        // Step 4: Find the bonding curve using owner and token address
        console.log(
          `[TokenDashboard] Finding bonding curve for owner ${fetchedOwnerAddress} and token ${tokenAddress}`
        );
        const bondingCurve = await findBondingCurveForProviderToken(
          publicClient,
          fetchedOwnerAddress,
          tokenAddress
        );
        setBondingCurveAddress(bondingCurve);
        console.log(
          `[TokenDashboard] Found bonding curve address: ${bondingCurve}`
        );
      } catch (err) {
        console.error("[TokenDashboard] Error fetching dashboard data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load token information"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (providerContractAddress && publicClient) {
      fetchData();
    }

    return () => {
      // Cleanup logic if needed when dependencies change or component unmounts
      setIsLoading(true);
      setError(null);
    };
  }, [providerContractAddress, publicClient, walletAddress]);

  if (isLoading) {
    return (
      <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        <p className="text-gray-400">Loading token data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700">
      <h2 className="text-xl font-semibold mb-4">Token Information</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-300">
            Provider Contract
          </h3>
          <p className="text-gray-400 break-words">{providerContractAddress}</p>
        </div>

        {ownerAddress && (
          <div>
            <h3 className="text-lg font-medium text-gray-300">Owner Address</h3>
            <p className="text-gray-400 break-words">{ownerAddress}</p>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-gray-300">Provider Token</h3>
          {tokenInfo.address ? (
            <div>
              <p className="text-gray-400 mb-1">
                <span className="font-medium">Name:</span>{" "}
                {tokenInfo.name || "Unknown"}
              </p>
              <p className="text-gray-400 mb-1">
                <span className="font-medium">Symbol:</span>{" "}
                {tokenInfo.symbol || "Unknown"}
              </p>
              <p className="text-gray-400 mb-1 break-words">
                <span className="font-medium">Address:</span>{" "}
                {tokenInfo.address}
              </p>
              {tokenInfo.balance !== null && (
                <p className="text-gray-400 mb-1">
                  <span className="font-medium">Your Balance:</span>{" "}
                  {Number(tokenInfo.balance).toFixed(4)}{" "}
                  {tokenInfo.symbol || "tokens"}
                </p>
              )}
              {!walletAddress && tokenInfo.address && (
                <p className="text-yellow-400 text-sm mt-2">
                  Connect your wallet to view token balance
                </p>
              )}
            </div>
          ) : (
            <p className="text-yellow-400">
              No provider token found for this service.
            </p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-300">Bonding Curve</h3>
          {bondingCurveAddress ? (
            <p className="text-gray-400 break-words">{bondingCurveAddress}</p>
          ) : (
            <p className="text-yellow-400">
              No bonding curve contract linked to this token.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
