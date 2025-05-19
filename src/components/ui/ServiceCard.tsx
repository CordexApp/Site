"use client";

import { Service } from "@/types/service";
import { formatCompactNumber } from "@/utils/marketCapUtils";
import Image from "next/image";
import Link from "next/link";

interface ServiceCardProps {
  service: Service;
}

// Remove TokenDisplay and its props
// interface TokenDisplayProps { ... }
// function TokenDisplay({ ... }) { ... }

export function ServiceCard({ service }: ServiceCardProps) {
  // const { provider_contract_address, coin_contract_address } = service; // No longer needed here for TokenDisplay
  // const isValidProviderAddress = ...; // No longer needed here for TokenDisplay

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
        {/* Token Info Section - Only Market Cap */}
        <div className="mt-auto pt-2 text-xs">
          {/* Display Market Cap */}
          {service.marketCap && service.marketCap !== "NaN" && (
            <p className="text-gray-300 font-medium">
              Market Cap: {formatCompactNumber(service.marketCap)} CRDX
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
