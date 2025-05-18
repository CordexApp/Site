"use client";

import { Grid } from "@/components/ui/Grid";
import { Service } from "@/types/service";
import { fetchAndCalculateMarketCap } from "@/utils/marketCapUtils";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, http, PublicClient } from "viem";
import { optimismSepolia } from "wagmi/chains";

interface ServiceListProps {
  initialServices: Service[];
}

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

  useEffect(() => {
    const fetchMarketCaps = async () => {
      if (!publicClient || initialServices.length === 0) {
        setLoadingMarketCaps(false);
        return;
      }

      console.log("[ServiceList] Starting to fetch market cap details for services...");
      const updatedServices = [...initialServices]; // Create a mutable copy

      const batchSize = 3;
      const delayBetweenBatches = 1000; // 1 second delay

      for (let i = 0; i < updatedServices.length; i += batchSize) {
        const batch = updatedServices.slice(i, i + batchSize);
        console.log(`[ServiceList] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} services)`);

        const batchPromises = batch.map(async (service, index) => {
          if (service.bonding_curve_address) {
            try {
              // Add small delay between requests in the same batch on client-side if needed
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
              const marketCapData = await fetchAndCalculateMarketCap(
                publicClient,
                service.bonding_curve_address as `0x${string}`
              );
              if (marketCapData) {
                // Find the service in the main 'updatedServices' array and update it
                const serviceIndexToUpdate = updatedServices.findIndex(s => s.id === service.id);
                if (serviceIndexToUpdate !== -1) {
                   updatedServices[serviceIndexToUpdate] = { ...updatedServices[serviceIndexToUpdate], ...marketCapData };
                }
                return { ...service, ...marketCapData }; // also return for intermediate state if needed by Promise.all
              }
            } catch (error) {
              console.error(
                `[ServiceList] Failed to fetch market cap for ${service.id} (BC: ${service.bonding_curve_address}):`,
                error
              );
            }
          }
          return service; // Return original service if no BC address or error
        });

        // Process current batch
        await Promise.all(batchPromises);
        
        // Update state after each batch is processed to show progressive loading
        setServices([...updatedServices]); 

        // Delay before processing next batch (only if not the last batch)
        if (i + batchSize < updatedServices.length) {
          console.log(`[ServiceList] Waiting before processing next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      setLoadingMarketCaps(false);
      console.log("[ServiceList] All market cap data fetched and services updated.");
    };

    fetchMarketCaps();
  }, [initialServices, publicClient]); // Rerun if initialServices or publicClient changes

  if (initialServices.length === 0) {
    return (
      <div className="w-full mt-6 bg-gray-900 p-8 text-center rounded-md">
        <p className="text-gray-400">No services currently available. Check back soon!</p>
      </div>
    );
  }

  return <Grid services={services} />;
} 