"use client";

import { useState } from "react";
import Link from "next/link";
import { MyServicesProvider, useMyServices } from "@/context/MyServicesContext";
import { ServiceManagementCard } from "@/components/ServiceManagementCard";
import { LoadingDots } from "@/components/ui";

// Inner component that uses the context
function MyServicesContent() {
  const { isLoading, error, services } = useMyServices();

  if (isLoading) {
    return (
      <div className="my-8 text-white">
        <LoadingDots text="Loading your services" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 text-red-400">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="my-8">
        <p>You don't have any active services yet.</p>
        <Link
          href="/launch-service"
          className="text-blue-400 hover:underline mt-4 inline-block"
        >
          Launch a new service
        </Link>
      </div>
    );
  }

  return (
    <div className="my-8">
      <div className="grid gap-6">
        {services.map((service) => (
          <ServiceManagementCard
            key={service.providerContractAddress}
            service={service}
          />
        ))}
      </div>
    </div>
  );
}

export default function MyServicesPage() {
  return (
    <MyServicesProvider>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] py-12 font-mono bg-black text-white">
        <h1 className="text-3xl font-bold mb-8">my services</h1>
        <div className="w-full max-w-3xl">
          <MyServicesContent />
        </div>
      </div>
    </MyServicesProvider>
  );
}
