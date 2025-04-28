"use client";

import ServiceHealthIndicator from "./ServiceHealthIndicator";

interface ServiceHealthWrapperProps {
  endpoint: string;
}

export default function ServiceHealthWrapper({
  endpoint,
}: ServiceHealthWrapperProps) {
  console.log(
    "[ServiceHealthWrapper] Rendering health indicator for:",
    endpoint
  );

  return <ServiceHealthIndicator endpoint={endpoint} />;
}
