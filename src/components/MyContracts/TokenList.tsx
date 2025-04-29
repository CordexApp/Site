"use client";

import { useRouter } from "next/navigation";
import { ProviderToken, BondingCurve } from "@/hooks/useMyContracts"; // Type imports should still work

interface TokenListProps {
  providerTokens: ProviderToken[];
  bondingCurves: BondingCurve[];
}

// Simple helper to shorten addresses
const shorten = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(addr.length - 4)}` : "";

export default function TokenList({
  providerTokens,
  bondingCurves,
}: TokenListProps) {
  const router = useRouter();

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold border-b border-gray-700 pb-2 mb-4">
        your tokens
      </h2>
      {providerTokens.length > 0 ? (
        <div className="space-y-4">
          {providerTokens.map((token) => {
            // Check if this token already has a bonding curve
            const hasBondingCurve = bondingCurves.some(
              (curve) => curve.tokenAddress === token.address
            );

            return (
              <div
                key={token.address}
                className="p-4 border border-gray-700 rounded-md"
              >
                <h3 className="font-bold text-lg">
                  {token.name} ({token.symbol})
                </h3>
                <p className="text-sm text-gray-400 mb-1 break-all">
                  token address: {token.address}
                  {/* Optional: Add Etherscan link */}
                  {/* <a href={`.../${token.address}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-400 hover:text-blue-300">(view)</a> */}
                </p>
                <p className="mb-3">
                  balance: {token.balance} {token.symbol}
                </p>
                <div className="mt-2">
                  {!hasBondingCurve ? (
                    <button
                      onClick={() =>
                        // TODO: Update this route when the deployment page exists
                        router.push(
                          `/launch?existingToken=${token.address}`
                          // Consider `/deploy-bonding-curve?tokenAddress=${token.address}` if dedicated page
                        )
                      }
                      className="text-sm border border-blue-800 hover:border-blue-500 px-3 py-1 rounded text-blue-300 hover:text-blue-100 transition-colors duration-150"
                    >
                      launch service with this token
                      {/* or "deploy bonding curve" if separate page */}
                    </button>
                  ) : (
                    <p className="text-sm text-green-400 mt-2">
                      ✅ bonding curve deployed
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 italic">no provider tokens found.</p>
      )}
    </div>
  );
}
