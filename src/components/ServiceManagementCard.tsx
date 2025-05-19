import { ProviderServiceDetails } from "@/context/MyServicesContext";
import { formatCompactNumber } from "@/utils/marketCapUtils";
import Link from "next/link";

interface ServiceManagementCardProps {
  service: ProviderServiceDetails;
}

export function ServiceManagementCard({ service }: ServiceManagementCardProps) {
  // Format the address for display
  const shortAddress = `${service.providerContractAddress.substring(0, 6)}...${service.providerContractAddress.substring(38)}`;
  
  // The service name should already be set in the context
  const serviceName = service.serviceName || `Service ${shortAddress}`;
  
  // Determine if core details are still loading. 
  // maxEscrow is a good proxy as it's fetched from the provider contract directly.
  const isLoadingDetails = service.maxEscrow === undefined && service.apiEndpoint === undefined;
  
  // Get token symbol if available
  const tokenSymbol = service.actualProviderTokenAddress 
    ? serviceName.substring(0, 3).toUpperCase()
    : null;

  return (
    <Link 
      href={`/manage-service/${service.providerContractAddress}`}
      className="flex flex-row items-start p-5 border-1 hover:border-white transition-all duration-300 border-gray-700 cursor-pointer hover:bg-black/30"
    >
      {/* Status indicator */}
      <div className="flex-shrink-0 mr-4 mt-1">
        <div 
          className={`h-4 w-4 rounded-full ${isLoadingDetails 
            ? "bg-gray-500 animate-pulse" 
            : service.isActive 
              ? "bg-green-500" 
              : "bg-cordex-red"}`}
        ></div>
      </div>
      
      <div className="flex flex-col flex-grow">
        {/* Service title and info row */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{serviceName}</h3>
          <span className="text-xs text-gray-400 font-mono">{shortAddress}</span>
        </div>
        
        {/* Conditional rendering for details based on isLoadingDetails */}
        {!isLoadingDetails ? (
          <>
            {/* API Endpoint */}
            {service.apiEndpoint && (
              <p className="text-sm text-gray-400 mb-3 line-clamp-1 font-mono" title={service.apiEndpoint}>
                {service.apiEndpoint}
              </p>
            )}
            
            {/* Service info grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-2">
              {service.maxEscrow && (
                <p className="text-gray-300">
                  <span className="text-gray-500">Max Escrow:</span> {service.maxEscrow} CRDX
                </p>
              )}
              
              {service.bondingCurveAddress && (
                <p className="text-gray-300">
                  <span className="text-gray-500">Bonding Curve:</span> Yes
                </p>
              )}
              {/* Render empty placeholders or ensure grid structure if items are missing */}
              {!service.maxEscrow && <div className="min-h-[1em]"></div>}
              {!service.bondingCurveAddress && <div className="min-h-[1em]"></div>}
            </div>
            
            {/* Token details section */}
            {(service.marketCap || tokenSymbol) && (
              <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap items-center gap-6 text-xs">
                {tokenSymbol && (
                  <div className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold mr-2">
                      {tokenSymbol}
                    </div>
                    <span className="text-gray-300">{serviceName} Token</span>
                  </div>
                )}
                
                {service.marketCap && service.marketCap !== "NaN" && (
                  <p className="text-green-400 font-medium">
                    <span className="text-gray-400 mr-1">Market Cap:</span>
                    {formatCompactNumber(service.marketCap)} CRDX
                  </p>
                )}
                
                {service.tokenPriceInCordex && service.tokenPriceInCordex !== "NaN" && (
                  <p className="text-gray-300">
                    <span className="text-gray-500 mr-1">Price:</span>
                    {parseFloat(service.tokenPriceInCordex).toFixed(5)} CRDX
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          // Basic skeleton for loading state of the details section
          <div className="space-y-2 mt-2">
            <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6"></div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="h-6 bg-gray-700 rounded animate-pulse w-1/3"></div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
