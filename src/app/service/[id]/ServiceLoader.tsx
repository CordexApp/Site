"use client";

import ContractStatusIndicator from "@/components/ContractStatusIndicator";
import ServiceHealthIndicator from "@/components/ServiceHealthIndicator";
import ServiceRequestFormWrapper from "@/components/ServiceRequestFormWrapper";
import TokenDashboard from "@/components/TokenDashboard";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { TypedText } from "@/components/ui/TypedText";
import { ServiceProvider } from "@/context/ServiceContext";
import {
  getServiceByContractAddress,
  getServiceById,
} from "@/services/servicesService";
import { Service } from "@/types/service";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { isAddress } from "viem";

interface ServiceLoaderProps {
  id: string;
}

export default function ServiceLoader({ id }: ServiceLoaderProps) {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 15;
  const hasSuccessfullyFetchedOnce = useRef(false);

  useEffect(() => {
    console.log(`[ServiceLoader] useEffect triggered. ID: ${id}`);
    
    hasSuccessfullyFetchedOnce.current = false; 
    pollCountRef.current = 0;                   
    setService(null);                           
    setLoading(true);                           
    setError(null);                             

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      console.log("[ServiceLoader] Cleared previous interval before new fetch cycle for ID:", id);
    }

    const fetchServiceAndUpdateState = async () => {
      if (!id) {
        console.warn("[ServiceLoader] Service ID is missing or invalid. Stopping.");
        setError("Service ID is missing.");
        setLoading(false);
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        return;
      }

      if (!hasSuccessfullyFetchedOnce.current) {
        setLoading(true);
      }

      try {
        let fetchedService: Service | null = null;
        if (isAddress(id)) {
          console.log(`[ServiceLoader] ID ${id} is an Ethereum address. Fetching by contract address.`);
          fetchedService = await getServiceByContractAddress(id);
        } else {
          console.log(`[ServiceLoader] ID ${id} is a UUID. Fetching by ID.`);
          fetchedService = await getServiceById(id);
        }
        
        console.log("[ServiceLoader] Raw response from fetch for ID", id, ":", fetchedService);

        if (fetchedService) {
          console.log("[ServiceLoader] Service found for ID", id, ":", fetchedService);
          console.log("[ServiceLoader] Description:", fetchedService.description);
          console.log("[ServiceLoader] Image URL:", fetchedService.image);
          
          setService(fetchedService);
          setLoading(false);
          setError(null);
          hasSuccessfullyFetchedOnce.current = true; 
          
          if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
            console.log("[ServiceLoader] Polling stopped: Service successfully found for ID:", id);
          }
        } else {
          if (hasSuccessfullyFetchedOnce.current) {
            console.log("[ServiceLoader] Post-success poll check for ID", id, ": Service became null/undefined, but UI remains. Interval should be cleared.");
             if (intervalIdRef.current) { 
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
            setLoading(false);
            return; 
          }

          pollCountRef.current += 1;
          console.log(
            `[ServiceLoader] Service not found yet (attempt ${pollCountRef.current}/${MAX_POLLS}) for ID: ${id}.`
          );

          if (pollCountRef.current >= MAX_POLLS) {
            console.warn(
              `[ServiceLoader] Polling limit (${MAX_POLLS} attempts) reached for ID: ${id}. Service not found.`
            );
            setError(
              `Service details for ID ${id} could not be loaded after ${MAX_POLLS} attempts. The ID might be invalid or there could be a network issue.`
            );
            setLoading(false); 
            if (intervalIdRef.current) { 
              clearInterval(intervalIdRef.current);
              intervalIdRef.current = null;
            }
            return; 
          }

          if (intervalIdRef.current === null && !hasSuccessfullyFetchedOnce.current) {
            console.log(
              `[ServiceLoader] Starting new polling interval (next attempt ${pollCountRef.current + 1}/${MAX_POLLS}) for ID: ${id}.`
            );
            intervalIdRef.current = setInterval(fetchServiceAndUpdateState, 3000);
          }
        }
      } catch (err) {
        console.error(`[ServiceLoader] Error during fetchServiceAndUpdateState for ID ${id}:`, err);
        if (!hasSuccessfullyFetchedOnce.current) {
          setError("Failed to fetch service. Please try again later.");
        }
        setLoading(false);
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
          console.log("[ServiceLoader] Polling stopped due to error for ID:", id);
        }
      }
    };

    fetchServiceAndUpdateState();

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        console.log("[ServiceLoader] Polling stopped: Component unmounted or ID changed from:", id);
      }
    };
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] text-red-500">
        <p className="text-xl">{error}</p>
        <SecondaryButton href="/" className="mt-4">Go back to services</SecondaryButton>
      </div>
    );
  }

  const endpoint = service?.endpoint || "";
  const contractAddress = service?.provider_contract_address || "";
  const coinAddress = service?.coin_contract_address || null;

  console.log("[ServiceLoader] About to render. States:", {
    id,
    loading,
    error,
    serviceExists: !!service,
    endpoint,
    contractAddress,
    fetchedServiceContent: service
  });

  return (
    <ServiceProvider initialService={service}>
      <div className="flex gap-4 mb-8">
        <SecondaryButton href="/">back to services</SecondaryButton>
      </div>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] py-8">
        <div className="flex flex-col md:flex-row w-full gap-8">
          <div className="w-full md:w-1/3 relative aspect-square overflow-hidden mb-4 md:mb-0">
            {loading && !service?.image && (
              <div className="w-full h-full bg-gray-800 animate-pulse flex items-center justify-center text-gray-500 rounded-md">
                <LoadingDots text="" />
              </div>
            )}
            {!loading && service?.image && (
              <div className="relative w-full h-full">
                <Image
                  src={service.image}
                  alt={service.name || "Service Image"}
                  fill
                  className="object-cover rounded-md"
                  priority
                  onError={(e) => {
                    console.error("[ServiceLoader] Error loading image:", service.image);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500 rounded-md">image load error</div>`;
                    }
                  }}
                />
              </div>
            )}
            {(!loading && !service?.image) && (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500 rounded-md">
                no image available
              </div>
            )}
          </div>

          <div className="flex flex-col w-full md:w-2/3">
            {loading && !service?.name && (
              <div className="h-9 bg-gray-800 rounded w-3/4 animate-pulse mb-3"></div>
            )}
            {service?.name && (
              <TypedText
                text={service.name}
                className="text-3xl font-bold mb-2"
              />
            )}
            {(!loading && !service?.name) && (
                 <TypedText
                    text={"Loading name..."}
                    className="text-3xl font-bold mb-2 text-gray-500"
                 />
            )}

            {/* Display service description if available */}
            {!loading && service?.description ? (
              <div className="text-gray-300 mb-6 mt-2 max-w-3xl">
                <h3 className="text-gray-400 text-sm mb-2">Description</h3>
                <p className="leading-relaxed">
                  {service.description}
                </p>
              </div>
            ) : !loading && !service?.description && (
              <div className="text-gray-500 mb-6 mt-2 text-sm italic">
                No description available
              </div>
            )}

            <div className="flex items-center space-x-6 mb-4">
              <div className="flex items-center">
                <p className="text-gray-400 mr-2">endpoint:</p>
                {loading && !endpoint && <span className="text-sm text-gray-500"><LoadingDots text="" /></span>}
                {!loading && endpoint && <ServiceHealthIndicator endpoint={endpoint} />}
                {!loading && !endpoint && <span className="text-sm text-gray-400">pending...</span>}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-2">contract:</p>
                {loading && !contractAddress && <span className="text-sm text-gray-500"><LoadingDots text="" /></span>}
                {!loading && contractAddress && <ContractStatusIndicator contractAddress={contractAddress} />}
                {!loading && !contractAddress && <span className="text-sm text-gray-400">pending...</span>}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-2">added:</p>
                {loading && !service?.created_at && <span className="text-sm text-gray-500"><LoadingDots text="" /></span>}
                {service?.created_at && (
                  <span className="text-white">
                    {new Date(service.created_at).toLocaleDateString()}
                  </span>
                )}
                {!loading && !service?.created_at && <span className="text-sm text-gray-400">pending...</span>}
              </div>
            </div>

            <div className="w-full">
              {(loading || (!endpoint || !contractAddress)) && !service && (
                  <div className="p-4 bg-black rounded border border-gray-700 animate-pulse">
                     <p className="text-gray-500">Initializing service interface...</p>
                     <p className="text-xs text-gray-600 mt-1">Waiting for endpoint and contract details.</p>
                  </div>
              )}
              {!loading && endpoint && contractAddress && service ? (
                <ServiceRequestFormWrapper />
              ) : !loading && (!service || !endpoint || !contractAddress) && (
                <div className="p-4 bg-black rounded border border-gray-700">
                  <p className="text-yellow-400">
                    Service interface not yet available.
                  </p>
                   <p className="text-sm text-gray-400 mt-1">
                    {(!endpoint || !contractAddress) ? "Endpoint or contract address is still pending. " : "Service data is incomplete. "}
                    {pollCountRef.current < MAX_POLLS && hasSuccessfullyFetchedOnce.current === false ? `Retrying... (Attempt ${pollCountRef.current +1}/${MAX_POLLS})` : (pollCountRef.current >= MAX_POLLS && !service ? "Failed to load details." : "")}
                   </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {(loading || !contractAddress) && !service?.provider_contract_address && (
            <div className="w-full mt-8 p-4 bg-black rounded border border-gray-700 animate-pulse">
                <p className="text-gray-500">Loading token dashboard...</p>
                 <p className="text-xs text-gray-600 mt-1">Waiting for contract details.</p>
            </div>
        )}
        {!loading && contractAddress && service && (
          <div className="w-full mt-8">
            <TokenDashboard
              providerContractAddress={contractAddress as `0x${string}`}
              coinContractAddress={coinAddress as (`0x${string}` | null)}
            />
          </div>
        )}
        
        {!loading && !service && !error && pollCountRef.current >= MAX_POLLS && (
             <div className="flex flex-col items-center justify-center w-full mt-10 py-10 border border-dashed border-gray-700 rounded-md text-white">
                <TypedText text="Service Unavailable" className="text-xl mb-2"/>
                <p className="text-sm text-gray-400 px-4 text-center">
                    The details for service ID <span className="font-mono text-gray-300">{id}</span> could not be loaded after {MAX_POLLS} attempts. <br/> 
                    This might be due to an incorrect ID, network issues, or the service is still provisioning.
                </p>
                {id && <p className="text-xs text-gray-500 mt-3">Searched for ID: {id}</p>}\
                <SecondaryButton href="/" className="mt-6">Return to Services</SecondaryButton>
             </div>
        )}
         {!loading && !service && !error && pollCountRef.current < MAX_POLLS && hasSuccessfullyFetchedOnce.current === false && (
             <div className="flex flex-col items-center justify-center w-full mt-10 py-10 border border-dashed border-gray-700 rounded-md text-white">
                <TypedText text="Connecting to Service..." className="text-xl mb-2"/>
                <LoadingDots text={`Attempt ${pollCountRef.current +1 } of ${MAX_POLLS}`} className="text-lg" />
                <p className="text-sm text-gray-400 px-4 text-center mt-3">
                    Waiting for service ID <span className="font-mono text-gray-300">{id}</span> to become available.
                </p>
             </div>
        )}
      </div>
    </ServiceProvider>
  );
} 