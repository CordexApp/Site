"use client";

import { useEffect } from "react";
import { useService } from "@/context/ServiceContext";
import DemoServiceRequestForm from "./DemoServiceRequestForm";
import { usePublicClient } from "wagmi";
import { getContractMaxEscrow } from "@/services/contractServices";

export default function ServiceRequestFormWrapper() {
  const { service, maxEscrow, setMaxEscrow } = useService();
  const publicClient = usePublicClient();

  // Fetch maxEscrow when component mounts
  useEffect(() => {
    const fetchMaxEscrow = async () => {
      if (service?.provider_contract_address && publicClient) {
        console.log(
          "[ServiceRequestFormWrapper] Fetching maxEscrow for contract:",
          service.provider_contract_address
        );

        try {
          const escrowValue = await getContractMaxEscrow(
            publicClient,
            service.provider_contract_address as `0x${string}`
          );

          console.log(
            "[ServiceRequestFormWrapper] Setting maxEscrow in context:",
            escrowValue
          );
          setMaxEscrow(escrowValue);
        } catch (error) {
          console.error(
            "[ServiceRequestFormWrapper] Error fetching maxEscrow:",
            error
          );
        }
      }
    };

    fetchMaxEscrow();
  }, [service?.provider_contract_address, publicClient, setMaxEscrow]);

  const serviceName = service?.name || "";
  const endpoint = service?.endpoint || "";
  const providerContractAddress = service?.provider_contract_address || "";

  useEffect(() => {
    console.log("[ServiceRequestFormWrapper] Rendering with service data:", {
      serviceName,
      endpoint,
      providerContractAddress,
    });
  }, [serviceName, endpoint, providerContractAddress]);

  if (!service || !service.endpoint || !service.provider_contract_address) {
    return (
      <div className="p-4 bg-black rounded border border-gray-700">
        <p className="text-yellow-400">
          Service not properly configured for API requests
        </p>
      </div>
    );
  }

  return (
    <DemoServiceRequestForm
      serviceName={serviceName}
      providerContractAddress={providerContractAddress}
    />
  );
}
