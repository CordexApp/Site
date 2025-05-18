"use client";

import ContractStatusIndicator from "@/components/ContractStatusIndicator";
import ServiceHealthIndicator from "@/components/ServiceHealthIndicator";
import ServiceRequestFormWrapper from "@/components/ServiceRequestFormWrapper";
import TokenDashboard from "@/components/TokenDashboard";
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

  useEffect(() => {
    console.log(`[ServiceLoader] useEffect triggered. ID: ${id}`);
    pollCountRef.current = 0;

    const fetchServiceAndUpdateState = async () => {
      if (!id) {
        console.warn("[ServiceLoader] Service ID is missing or invalid. Stopping.");
        setError("Service ID is missing.");
        setLoading(false);
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        return;
      }

      try {
        let fetchedService: Service | null = null;
        if (isAddress(id)) {
          console.log(`[ServiceLoader] ID ${id} is an Ethereum address. Using getServiceByContractAddress.`);
          fetchedService = await getServiceByContractAddress(id);
        } else {
          console.log(`[ServiceLoader] ID ${id} is not an Ethereum address (likely UUID). Using getServiceById.`);
          fetchedService = await getServiceById(id);
        }
        
        console.log("[ServiceLoader] Raw response from fetch:", fetchedService);

        if (fetchedService) {
          console.log("[ServiceLoader] Service found:", fetchedService);
          setService(fetchedService);
          setLoading(false);
          setError(null);
          if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
            console.log("[ServiceLoader] Polling stopped: Service successfully found.");
          }
        } else {
          pollCountRef.current += 1;
          console.log(
            `[ServiceLoader] Service not found yet (attempt ${pollCountRef.current}/${MAX_POLLS}) for ID: ${id}. Current service state:`,
            service
          );

          if (pollCountRef.current > MAX_POLLS) {
            console.warn(
              `[ServiceLoader] Polling limit (${MAX_POLLS} attempts) reached for ID: ${id}. Service not found.`
            );
            setError(
              `Service details for ID ${id} could not be loaded after several attempts. The ID might be invalid or there could be a network issue.`
            );
            setLoading(false);
            if (intervalIdRef.current) {
              clearInterval(intervalIdRef.current);
              intervalIdRef.current = null;
            }
            return;
          }

          if (intervalIdRef.current === null && !service) {
            console.log(
              `[ServiceLoader] Starting new polling interval (attempt ${pollCountRef.current}/${MAX_POLLS}) for ID: ${id}.`
            );
            intervalIdRef.current = setInterval(
              fetchServiceAndUpdateState,
              3000
            );
          } else if (service) {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
                console.log("[ServiceLoader] Polling stopped: Service found during poll check (unexpected). ID: ${id}");
            }
          } else {
             console.log(
              `[ServiceLoader] Polling already active (attempt ${pollCountRef.current}/${MAX_POLLS}) for ID: ${id}. Interval ID:`,
              intervalIdRef.current
            );
          }
          if (!service) {
            setLoading(true);
          }
        }
      } catch (err) {
        console.error(`[ServiceLoader] Error during fetchServiceAndUpdateState for ID ${id}:`, err);
        setError("Failed to fetch service. Please try again later.");
        setLoading(false);
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
          console.log("[ServiceLoader] Polling stopped due to error. ID: ${id}");
        }
      }
    };

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      console.log("[ServiceLoader] Cleared previous interval due to ID change or re-effect. New ID: ${id}");
    }
    
    pollCountRef.current = 0;
    setService(null);
    setLoading(true);
    setError(null);

    fetchServiceAndUpdateState();

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        console.log("[ServiceLoader] Polling stopped: Component unmounted or effect re-ran. ID: ${id}");
      }
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-xl">Loading service details...</p>
        <p className="text-sm text-gray-400">This may take a moment if the service was just launched.</p>
        {id && <p className="text-xs text-gray-500 mt-2">Searching for ID: {id}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] text-red-500">
        <p className="text-xl">{error}</p>
        <SecondaryButton href="/" className="mt-4">Go back to services</SecondaryButton>
      </div>
    );
  }

  if (!service) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] text-white">
            <p className="text-xl">Service not found.</p>
            <p className="text-sm text-gray-400">The service details could not be loaded. It might still be provisioning or the ID is incorrect.</p>
            {id && <p className="text-xs text-gray-500 mt-2">Searched for ID: {id}</p>}
            <SecondaryButton href="/" className="mt-4">Go back to services</SecondaryButton>
        </div>
    );
  }

  const endpoint = service.endpoint || "";
  const contractAddress = service.provider_contract_address || "";

  return (
    <ServiceProvider initialService={service}>
      <div className="flex gap-4 mb-8">
        <SecondaryButton href="/">back to services</SecondaryButton>
      </div>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] py-8">
        <div className="flex flex-col md:flex-row w-full gap-8">
          <div className="w-full md:w-1/3 relative aspect-square overflow-hidden mb-4 md:mb-0">
            {service.image ? (
              <Image
                src={service.image}
                alt={service.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500">
                no image available
              </div>
            )}
          </div>

          <div className="flex flex-col w-full md:w-2/3">
            <TypedText
              text={service.name}
              className="text-3xl font-bold mb-2"
            />

            <div className="flex items-center space-x-6 mb-4">
              <div className="flex items-center">
                <p className="text-gray-400 mr-2">endpoint:</p>
                {endpoint ? (
                  <ServiceHealthIndicator endpoint={endpoint} />
                ) : (
                  <span className="text-sm text-gray-400">none</span>
                )}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-2">contract:</p>
                {contractAddress ? (
                  <ContractStatusIndicator contractAddress={contractAddress} />
                ) : (
                  <span className="text-sm text-gray-400">none</span>
                )}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-2">added:</p>
                <span className="ext-white">
                  {new Date(service.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="w-full">
              {endpoint && contractAddress ? (
                <ServiceRequestFormWrapper />
              ) : (
                <div className="p-4 bg-black rounded border border-gray-700">
                  <p className="text-yellow-400">
                    service not properly configured for api requests
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        {contractAddress && (
          <div className="w-full">
            <TokenDashboard
              providerContractAddress={contractAddress as `0x${string}`}
            />
          </div>
        )}
      </div>
    </ServiceProvider>
  );
} 