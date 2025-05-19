"use client";

import { Grid } from "@/components/ui/Grid";
import { Service } from "@/types/service";
import { fetchAndCalculateMarketCap } from "@/utils/marketCapUtils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, http, PublicClient } from "viem";
import { optimismSepolia } from "wagmi/chains";

interface ServiceListProps {
  initialServices: Service[];
}

const MARKET_CAP_POLL_INTERVAL = 300000; // 5 minutes
const BATCH_SIZE = 5; // Process 5 services per batch
const DELAY_BETWEEN_BATCHES = 500; // 0.5 second delay between batches

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

export default function ServiceList({ initialServices }: ServiceListProps) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [loadingMarketCaps, setLoadingMarketCaps] = useState(true);
  const publicClient = useMemo(() => getPublicClient(), []);

  // Update local services state if initialServices prop changes
  useEffect(() => {
    setServices(initialServices);
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
        setServices([...newServiceData]);

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

  // Effect for initial fetch when component mounts or initialServices change
  useEffect(() => {
    if (initialServices.length > 0 && publicClient) {
      fetchMarketCapsForServiceList(initialServices);
    } else if (initialServices.length === 0) {
      setServices([]); // Clear services if initialServices is empty
      setLoadingMarketCaps(false);
    }
  }, [initialServices, publicClient, fetchMarketCapsForServiceList]);

  // Effect for polling market cap data
  useEffect(() => {
    if (!publicClient) return;

    const intervalId = setInterval(() => {
      console.log("[ServiceList] Polling for market cap updates...");
      // Use the functional update form of setServices to get the current services
      // Then trigger fetchMarketCapsForServiceList with that current list.
      // fetchMarketCapsForServiceList itself will call setServices.
      // We need to ensure services in the closure of setInterval is up-to-date.
      // Passing `services` directly to fetchMarketCapsForServiceList from here is tricky due to stale closures.
      // Instead, fetchMarketCapsForServiceList will operate on the `services` state via `setServices(prev => ...)`.
      // Or, more directly, let's re-evaluate if `fetchMarketCapsForServiceList` needs current state or `initialServices`
      // For polling, we want to update the *currently displayed* services.
      
      // A better way for polling: fetchMarketCapsForServiceList should be self-contained or use a ref for current services.
      // Given current structure, we call it with the `services` available in this scope.
      // The `services` dependency in the outer useEffect for polling will ensure it uses the latest.
      // This will re-run the fetch if `services` state changes from other sources, which is fine.
      if (services.length > 0) {
         fetchMarketCapsForServiceList(services);
      }

    }, MARKET_CAP_POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [publicClient, services, fetchMarketCapsForServiceList]); // Add services and fetchMarketCapsForServiceList

  if (initialServices.length === 0 && !loadingMarketCaps) {
    return (
      <div className="w-full mt-6 bg-gray-900 p-8 text-center rounded-md">
        <p className="text-gray-400">No services currently available. Check back soon!</p>
      </div>
    );
  }

  return <Grid services={services} />;
} 