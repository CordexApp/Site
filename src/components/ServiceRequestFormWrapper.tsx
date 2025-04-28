"use client";

import { useEffect } from "react";
import { useService } from "@/context/ServiceContext";
import ServiceRequestForm from "./ServiceRequestForm";

export default function ServiceRequestFormWrapper() {
  const { service } = useService();

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
      <div className="p-4 bg-gray-800 rounded border border-gray-700">
        <p className="text-yellow-400">
          Service not properly configured for API requests
        </p>
      </div>
    );
  }

  return (
    <ServiceRequestForm
      serviceName={serviceName}
      endpoint={endpoint}
      providerContractAddress={providerContractAddress}
    />
  );
}
