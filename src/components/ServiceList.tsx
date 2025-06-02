"use client";

import { SortDirection, SortOption } from "@/components/SortButton";
import { Grid } from "@/components/ui/Grid";
import { Service } from "@/types/service";
import { fetchAndCalculateMarketCap } from "@/utils/marketCapUtils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, http, PublicClient } from "viem";
import { optimismSepolia } from "wagmi/chains";

interface ServiceListProps {
  initialServices: Service[];
  totalServices: number;
  initialLimit: number;
  searchQuery?: string;
  onSearchResults?: (services: Service[], totalCount: number) => void;
  currentSort: SortOption;
  currentDirection: SortDirection;
  onMarketCapLoadingChange?: (loading: boolean) => void;
}

// Increased polling interval to 10 minutes (was 5 min)
const MARKET_CAP_POLL_INTERVAL = 600000; // 10 minutes
const BATCH_SIZE = 3; // Reduced from 5 to 3 services per batch
const DELAY_BETWEEN_BATCHES = 1000; // Increased from 500ms to 1000ms delay between batches

// Function to create a public client
function getPublicClient(): PublicClient | null {
  const infuraHttpUrl = process.env.NEXT_PUBLIC_INFURA_OP_SEPOLIA_HTTP_URL;
  if (!infuraHttpUrl) {
    console.error(
      "[ServiceList] CRITICAL: Infura HTTP URL not found. Market cap data will be unavailable."
    );
    return null;
  }
  try {
    return createPublicClient({
      chain: optimismSepolia,
      transport: http(infuraHttpUrl),
    });
  } catch (e) {
    console.error("[ServiceList] Error creating public client:", e);
    return null;
  }
}

// Throttle function to prevent too many calls in quick succession
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default function ServiceList({ initialServices, totalServices, initialLimit, searchQuery, onSearchResults, currentSort, currentDirection, onMarketCapLoadingChange }: ServiceListProps) {
  const [allLoadedServices, setAllLoadedServices] = useState<Service[]>(initialServices);
  const [currentOffset, setCurrentOffset] = useState<number>(initialServices.length);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorLoadingMore, setErrorLoadingMore] = useState<string | null>(null);
  
  const [loadingMarketCaps, setLoadingMarketCaps] = useState(false);
  const [lastPollingTime, setLastPollingTime] = useState<number>(0);
  const publicClient: any = useMemo(() => getPublicClient(), []);

  // Update local services state if initialServices prop changes
  // Preserve existing market cap data when possible
  useEffect(() => {
    setAllLoadedServices(prevServices => {
      // Create a map of existing services with market cap data
      const existingServicesMap = new Map(
        prevServices.map(service => [service.id, service])
      );
      
      // Merge initial services with existing market cap data
      const mergedServices = initialServices.map(initialService => {
        const existingService = existingServicesMap.get(initialService.id);
        if (existingService && existingService.marketCap !== undefined) {
          // Preserve market cap data from existing service
          return {
            ...initialService,
            marketCap: existingService.marketCap,
            tokenPriceInCordex: existingService.tokenPriceInCordex,
            tokenTotalSupply: existingService.tokenTotalSupply,
            actualProviderTokenAddress: existingService.actualProviderTokenAddress,
            tokenDecimals: existingService.tokenDecimals
          };
        }
        return initialService;
      });
      
      return mergedServices;
    });
    setCurrentOffset(initialServices.length); // Reset offset when initial services change
  }, [initialServices]);

  // Function to sort services based on current sort option and direction
  const sortServices = useCallback((services: Service[], sortBy: SortOption, direction: SortDirection): Service[] => {
    const sorted = [...services];
    
    switch (sortBy) {
      case "alphabetical":
        return sorted.sort((a, b) => {
          const comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          return direction === "asc" ? comparison : -comparison;
        });
      
      case "dateadded":
        return sorted.sort((a, b) => {
          const comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          return direction === "asc" ? comparison : -comparison;
        });
      
      case "marketcap":
        return sorted.sort((a, b) => {
          const aMarketCap = a.marketCap ? parseFloat(a.marketCap) : 0;
          const bMarketCap = b.marketCap ? parseFloat(b.marketCap) : 0;
          
          // If both have no market cap, sort alphabetically as fallback
          if (aMarketCap === 0 && bMarketCap === 0) {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          }
          
          const comparison = aMarketCap - bMarketCap;
          return direction === "asc" ? comparison : -comparison;
        });
      
      default:
        return sorted;
    }
  }, []);

  // Get sorted services for display
  const sortedServices = useMemo(() => {
    return sortServices(allLoadedServices, currentSort, currentDirection);
  }, [allLoadedServices, currentSort, currentDirection, sortServices]);

  // Notify parent about loading state changes
  useEffect(() => {
    onMarketCapLoadingChange?.(loadingMarketCaps);
  }, [loadingMarketCaps, onMarketCapLoadingChange]);

  const fetchMarketCapsForServices = useCallback(
    async (servicesToUpdate: Service[]) => {
      if (!publicClient || servicesToUpdate.length === 0) {
        return;
      }

      // Filter to only services that don't already have market cap data
      const servicesToFetch = servicesToUpdate.filter(service => 
        service.bonding_curve_address && service.marketCap === undefined
      );

      if (servicesToFetch.length === 0) {
        console.log("[ServiceList] All services already have market cap data, skipping fetch");
        return;
      }

      console.log(
        "[ServiceList] Starting to fetch/update market cap details for services:",
        servicesToFetch.map(s => s.id)
      );

      // Record the time we started polling
      setLastPollingTime(Date.now());

      // Create a new array for updates to avoid mutating state directly during async operations
      let newServiceData = [...servicesToFetch];

      for (let i = 0; i < newServiceData.length; i += BATCH_SIZE) {
        const batch = newServiceData.slice(i, i + BATCH_SIZE);
        console.log(
          `[ServiceList] Processing batch ${
            Math.floor(i / BATCH_SIZE) + 1
          } (${batch.length} services)`
        );

        const batchPromises = batch.map(async (serviceInBatch) => {
          if (serviceInBatch.bonding_curve_address) {
            try {
              const marketCapData = await fetchAndCalculateMarketCap(
                publicClient,
                serviceInBatch.bonding_curve_address as `0x${string}`
              );
              // Find the index in the 'newServiceData' array and update
              const indexToUpdate = newServiceData.findIndex(s => s.id === serviceInBatch.id);
              if (indexToUpdate !== -1) {
                if (marketCapData) {
                  // Explicitly assign fields from marketCapData
                  newServiceData[indexToUpdate].marketCap = marketCapData.marketCap;
                  newServiceData[indexToUpdate].tokenPriceInCordex = marketCapData.tokenPriceInCordex;
                  newServiceData[indexToUpdate].tokenTotalSupply = marketCapData.tokenTotalSupply;
                  newServiceData[indexToUpdate].actualProviderTokenAddress = marketCapData.actualProviderTokenAddress;
                  newServiceData[indexToUpdate].tokenDecimals = marketCapData.tokenDecimals;
                } else {
                  // Ensure marketCap and related fields are undefined if marketCapData is null
                  newServiceData[indexToUpdate].marketCap = undefined;
                  newServiceData[indexToUpdate].tokenPriceInCordex = undefined;
                  newServiceData[indexToUpdate].tokenTotalSupply = undefined;
                  newServiceData[indexToUpdate].actualProviderTokenAddress = undefined;
                  newServiceData[indexToUpdate].tokenDecimals = undefined;
                }
              }
            } catch (error) {
              console.error(
                `[ServiceList] Failed to fetch market cap for ${serviceInBatch.id} (BC: ${serviceInBatch.bonding_curve_address}):`,
                error
              );
              const indexToUpdateOnError = newServiceData.findIndex(s => s.id === serviceInBatch.id);
              if (indexToUpdateOnError !== -1) {
                newServiceData[indexToUpdateOnError].marketCap = undefined;
                newServiceData[indexToUpdateOnError].tokenPriceInCordex = undefined;
                newServiceData[indexToUpdateOnError].tokenTotalSupply = undefined;
                newServiceData[indexToUpdateOnError].actualProviderTokenAddress = undefined;
                newServiceData[indexToUpdateOnError].tokenDecimals = undefined;
              }
            }
          } else {
            // No bonding_curve_address, ensure marketCap and related fields are undefined
            const indexToUpdateNoBc = newServiceData.findIndex(s => s.id === serviceInBatch.id);
            if (indexToUpdateNoBc !== -1) {
              newServiceData[indexToUpdateNoBc].marketCap = undefined;
              newServiceData[indexToUpdateNoBc].tokenPriceInCordex = undefined;
              newServiceData[indexToUpdateNoBc].tokenTotalSupply = undefined;
              newServiceData[indexToUpdateNoBc].actualProviderTokenAddress = undefined;
              newServiceData[indexToUpdateNoBc].tokenDecimals = undefined;
            }
          }
        });

        await Promise.all(batchPromises.map(p => p.catch(e => console.error("Error in batch promise:", e))));
        
        // Update state after each batch is processed
        setAllLoadedServices(prevAllServices => {
          const updatedList = [...prevAllServices];
          newServiceData.slice(i, i + BATCH_SIZE).forEach(updatedServiceFromBatch => {
            const idx = updatedList.findIndex(s => s.id === updatedServiceFromBatch.id);
            if (idx !== -1) {
              // Merge the market cap data with existing service data
              updatedList[idx] = { 
                ...updatedList[idx], 
                marketCap: updatedServiceFromBatch.marketCap,
                tokenPriceInCordex: updatedServiceFromBatch.tokenPriceInCordex,
                tokenTotalSupply: updatedServiceFromBatch.tokenTotalSupply,
                actualProviderTokenAddress: updatedServiceFromBatch.actualProviderTokenAddress,
                tokenDecimals: updatedServiceFromBatch.tokenDecimals
              };
            }
          });
          return updatedList;
        });

        if (i + BATCH_SIZE < newServiceData.length) {
          console.log(`[ServiceList] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
      console.log(
        "[ServiceList] All market cap data fetched and services updated."
      );
    },
    [publicClient] // Only publicClient is a stable dependency here
  );

  // Throttled version of the fetch function to prevent too many calls
  const throttledFetchMarketCaps = useMemo(
    () => throttle(fetchMarketCapsForServices, 5000), // 5 second throttle
    [fetchMarketCapsForServices]
  );

  // Effect for initial market cap fetch - always fetch market cap data
  useEffect(() => {
    if (allLoadedServices.length > 0 && publicClient) {
      // Always fetch market caps for services that don't already have them
      const servicesNeedingMarketCap = allLoadedServices.filter(service => 
        service.bonding_curve_address && service.marketCap === undefined
      );
      
      if (servicesNeedingMarketCap.length > 0) {
        console.log(`[ServiceList] Fetching market caps for ${servicesNeedingMarketCap.length} services (always show market cap)`);
        setLoadingMarketCaps(true);
        fetchMarketCapsForServices(servicesNeedingMarketCap).finally(() => setLoadingMarketCaps(false));
      }
    }
  }, [allLoadedServices, publicClient, fetchMarketCapsForServices]);

  // Effect for polling market cap data - only poll if we have services with existing data
  useEffect(() => {
    if (!publicClient) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastPoll = now - lastPollingTime;

      // Only poll if we haven't polled recently and we have services with existing market cap data to update
      if (timeSinceLastPoll >= MARKET_CAP_POLL_INTERVAL && allLoadedServices.length > 0) {
        const servicesWithMarketCap = allLoadedServices.filter(service => 
          service.bonding_curve_address && service.marketCap !== undefined
        );
        
        if (servicesWithMarketCap.length > 0) {
          console.log(`[ServiceList] Polling for market cap updates for ${servicesWithMarketCap.length} services...`);
          // For polling, we temporarily allow re-fetching by setting marketCap to undefined
          const servicesToRefresh = servicesWithMarketCap.map(service => ({
            ...service,
            marketCap: undefined,
            tokenPriceInCordex: undefined,
            tokenTotalSupply: undefined,
            actualProviderTokenAddress: undefined,
            tokenDecimals: undefined
          }));
          throttledFetchMarketCaps(servicesToRefresh);
        }
      }
    }, MARKET_CAP_POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [publicClient, allLoadedServices, lastPollingTime, throttledFetchMarketCaps]);

  const handleLoadMore = async () => {
    if (isLoadingMore || currentOffset >= totalServices) return;

    setIsLoadingMore(true);
    setErrorLoadingMore(null);
    try {
      // We need getServicesByOwnerOrAll here
      // It's better to import it directly rather than passing as prop
      const { getServicesByOwnerOrAll } = await import("@/services/servicesService");
      const nextPageData = await getServicesByOwnerOrAll(undefined, initialLimit, currentOffset, searchQuery);
      
      setAllLoadedServices(prevServices => [...prevServices, ...nextPageData.services]);
      setCurrentOffset(prevOffset => prevOffset + nextPageData.services.length);
      
      // Always fetch market caps for the newly added services
      if (nextPageData.services.length > 0 && publicClient) {
        console.log(`[ServiceList] Fetching market caps for ${nextPageData.services.length} newly loaded services`);
        throttledFetchMarketCaps(nextPageData.services); 
      }

    } catch (err) {
      console.error("[ServiceList] Error loading more services:", err);
      setErrorLoadingMore("Failed to load more services.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (initialServices.length === 0 && !loadingMarketCaps && !isLoadingMore) {
    return (
      <div className="w-full mt-6 bg-gray-900 p-8 text-center rounded-md">
        <p className="text-gray-400">No services currently available. Check back soon!</p>
      </div>
    );
  }

  return (
    <>
      {/* Loading Market Cap Data Indicator */}
      {loadingMarketCaps && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400">
            <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-sm">Fetching market cap data...</span>
          </div>
        </div>
      )}

      <Grid services={sortedServices} />
      
      {currentOffset < totalServices && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 border border-white text-white font-medium hover:bg-white hover:text-black transition-colors disabled:opacity-50 rounded-md"
          >
            {isLoadingMore ? "Loading..." : "Load More Services"}
          </button>
        </div>
      )}
      {errorLoadingMore && <p className="mt-4 text-center text-red-500">{errorLoadingMore}</p>}
    </>
  );
} 