"use client";

import { useEffect } from "react";
import ServiceRequestForm from "./ServiceRequestForm";

interface ServiceRequestFormWrapperProps {
  serviceName: string;
  endpoint: string;
  providerContractAddress: string;
}

export default function ServiceRequestFormWrapper({
  serviceName,
  endpoint,
  providerContractAddress,
}: ServiceRequestFormWrapperProps) {
  useEffect(() => {
    console.log("[ServiceRequestFormWrapper] Rendering with props:", {
      serviceName,
      endpoint,
      providerContractAddress,
    });
  }, [serviceName, endpoint, providerContractAddress]);

  return (
    <ServiceRequestForm
      serviceName={serviceName}
      endpoint={endpoint}
      providerContractAddress={providerContractAddress}
    />
  );
}
