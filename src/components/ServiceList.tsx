"use client";

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

export default function ServiceList({ initialServices, totalServices, initialLimit }: ServiceListProps) {
  const [allLoadedServices, setAllLoadedServices] = useState<Service[]>(initialServices);
  const [currentOffset, setCurrentOffset] = useState<number>(initialServices.length);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorLoadingMore, setErrorLoadingMore] = useState<string | null>(null);
  
  const [loadingMarketCaps, setLoadingMarketCaps] = useState(true);
  const [lastPollingTime, setLastPollingTime] = useState<number>(0);
  const publicClient: any = useMemo(() => getPublicClient(), []);

  // Update local services state if initialServices prop changes
  useEffect(() => {
    setAllLoadedServices(initialServices);
    setCurrentOffset(initialServices.length); // Reset offset when initial services change
  }, [initialServices]);

  const fetchMarketCapsForServiceList = useCallback(
    async (servicesToUpdate: Service[]) => {
      if (!publicClient || servicesToUpdate.length === 0) {
        setLoadingMarketCaps(false);
        return;
      }

      // Only set loading true if it's not already loading (to avoid flicker during polling)
      setLoadingMarketCaps(currentLoading => currentLoading ? true : true);
      console.log(
        "[ServiceList] Starting to fetch/update market cap details for services:",
        servicesToUpdate.map(s => s.id)
      );

      // Record the time we started polling
      setLastPollingTime(Date.now());

      // Create a new array for updates to avoid mutating state directly during async operations
      let newServiceData = [...servicesToUpdate];

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
              updatedList[idx] = { ...updatedList[idx], ...updatedServiceFromBatch };
            }
          });
          return updatedList;
        });

        if (i + BATCH_SIZE < newServiceData.length) {
          console.log(`[ServiceList] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
      setLoadingMarketCaps(false);
      console.log(
        "[ServiceList] All market cap data fetched and services updated."
      );
    },
    [publicClient] // Only publicClient is a stable dependency here
  );

  // Throttled version of the fetch function to prevent too many calls
  const throttledFetchMarketCaps = useMemo(
    () => throttle(fetchMarketCapsForServiceList, 5000), // 5 second throttle
    [fetchMarketCapsForServiceList]
  );

  // Effect for initial market cap fetch when component mounts or relevant services change
  useEffect(() => {
    if (allLoadedServices.length > 0 && publicClient) {
      // Fetch market caps for all currently loaded services
      throttledFetchMarketCaps(allLoadedServices);
    } else if (allLoadedServices.length === 0) {
      setLoadingMarketCaps(false);
    }
  }, [allLoadedServices, publicClient, throttledFetchMarketCaps]);

  // Effect for polling market cap data - only poll if enough time has passed
  useEffect(() => {
    if (!publicClient) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastPoll = now - lastPollingTime;

      // Only poll if we haven't polled recently and we have services to update
      if (timeSinceLastPoll >= MARKET_CAP_POLL_INTERVAL && allLoadedServices.length > 0) {
        console.log("[ServiceList] Polling for market cap updates...");
        throttledFetchMarketCaps(allLoadedServices);
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
      const nextPageData = await getServicesByOwnerOrAll(undefined, initialLimit, currentOffset);
      
      setAllLoadedServices(prevServices => [...prevServices, ...nextPageData.services]);
      setCurrentOffset(prevOffset => prevOffset + nextPageData.services.length);
      
      // Fetch market caps for the newly added services
      if (nextPageData.services.length > 0 && publicClient) {
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
      <Grid services={allLoadedServices} />
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