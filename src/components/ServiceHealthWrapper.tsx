"use client";

import { useService } from "@/context/ServiceContext";
import ServiceHealthIndicator from "./ServiceHealthIndicator";

export default function ServiceHealthWrapper() {
  const { service } = useService();
  const endpoint = service?.endpoint || "";

  console.log(
    "[ServiceHealthWrapper] Rendering health indicator for:",
    endpoint
  );

  if (!endpoint) {
    return null;
  }

  return <ServiceHealthIndicator endpoint={endpoint} />;
}
