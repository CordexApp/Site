"use client";

import Image from "next/image";
import Link from "next/link";
import { Service } from "@/types/service";
import { useTokenDashboard } from "@/hooks/useTokenDashboard";

interface ServiceCardProps {
  service: Service;
}

// Internal component to handle token data fetching and display
interface TokenDisplayProps {
  providerContractAddress: `0x${string}`;
}

function TokenDisplay({ providerContractAddress }: TokenDisplayProps) {
  const {
    tokenInfo,
    bondingCurveInfo,
    isLoading: isTokenDataLoading,
    error: tokenDataError,
  } = useTokenDashboard(providerContractAddress);

  // Cast error type explicitly
  const typedError = tokenDataError as Error | null;

  // Note: Hook returns price/supply as formatted decimal strings
  const marketCap =
    bondingCurveInfo?.currentPrice !== undefined &&
    bondingCurveInfo?.tokenSupply !== undefined
      ? parseFloat(bondingCurveInfo.currentPrice) *
        parseFloat(bondingCurveInfo.tokenSupply)
      : null;

  // Helper function to format market cap
  const formatMarketCap = (cap: number | null) => {
    if (cap === null || isNaN(cap)) return "N/A";
    if (cap >= 1_000_000_000) return `${(cap / 1_000_000_000).toFixed(2)}B`;
    if (cap >= 1_000_000) return `${(cap / 1_000_000).toFixed(2)}M`;
    if (cap >= 1_000) return `${(cap / 1_000).toFixed(2)}K`;
    return cap.toFixed(2);
  };

  if (isTokenDataLoading) {
    return <p className="text-gray-500">Loading token data...</p>;
  }

  if (typedError) {
    const errorMessage = typedError.message || String(typedError);
    return (
      <p className="text-cordex-red" title={errorMessage}>
        Token Error
      </p>
    );
  }

  if (tokenInfo?.symbol) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-gray-400 font-medium">{tokenInfo.symbol}</span>
        <span className="text-gray-300">
          market cap: {formatMarketCap(marketCap)} CRDX
        </span>
      </div>
    );
  }

  // Fallback if no symbol is found even after loading without error
  return <p className="text-yellow-500">No token data</p>;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { provider_contract_address } = service;
  // Check if address is valid before attempting to render TokenDisplay
  const isValidAddress =
    provider_contract_address && provider_contract_address.startsWith("0x");

  return (
    <Link
      href={`/service/${service.id}`}
      className="flex flex-row items-center justify-start gap-4 p-4 border-1 hover:border-white transition-all duration-300 border-gray-700 cursor-pointer"
    >
      <div className="w-24 h-24 relative overflow-hidden">
        {service.image ? (
          <Image
            src={service.image}
            alt={service.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500">
            No img
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow">
        <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
        <p
          className="text-sm text-gray-400 mb-2 line-clamp-1"
          title={service.endpoint}
        >
          {service.endpoint || "No endpoint"}
        </p>
        {/* Token Info Section */}
        <div className="mt-auto pt-2 text-xs">
          {isValidAddress ? (
            <TokenDisplay
              providerContractAddress={
                provider_contract_address as `0x${string}`
              }
            />
          ) : (
            <p className="text-gray-600">No contract</p>
          )}
        </div>
      </div>
    </Link>
  );
}
