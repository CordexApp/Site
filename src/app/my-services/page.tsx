"use client";

import { useState } from "react";
import Link from "next/link";
import { MyServicesProvider, useMyServices } from "@/context/MyServicesContext";

// Inner component that uses the context
function MyServicesContent() {
  const { isLoading, error, services } = useMyServices();

  if (isLoading) {
    return (
      <div className="my-8 text-white">
        <p>Loading your services...</p>
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
          <div
            key={service.providerContractAddress}
            className="border border-gray-700 rounded-md p-4 hover:bg-gray-900 transition-colors"
          >
            <Link href={`/manage-service/${service.providerContractAddress}`}>
              <div className="mb-3">
                <h3 className="text-xl font-bold mb-2 hover:text-blue-400">
                  Service {service.providerContractAddress.substring(0, 6)}...
                  {service.providerContractAddress.substring(38)}
                </h3>
                <div className="flex items-center mb-2">
                  <span className="text-gray-400 mr-2">Status:</span>
                  <span
                    className={
                      service.isActive ? "text-green-400" : "text-red-400"
                    }
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <p>
                  <span className="text-gray-400">Contract:</span>{" "}
                  {service.providerContractAddress}
                </p>
                {service.apiEndpoint && (
                  <p>
                    <span className="text-gray-400">API Endpoint:</span>{" "}
                    {service.apiEndpoint}
                  </p>
                )}
                {service.maxEscrow && (
                  <p>
                    <span className="text-gray-400">Max Escrow:</span>{" "}
                    {service.maxEscrow} CRDX
                  </p>
                )}
                {service.bondingCurveAddress && (
                  <p>
                    <span className="text-gray-400">Bonding Curve:</span>{" "}
                    {service.bondingCurveAddress}
                  </p>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyServicesPage() {
  return (
    <MyServicesProvider>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-12 font-mono bg-black text-white">
        <h1 className="text-3xl font-bold mb-8">my services</h1>
        <div className="w-full max-w-3xl">
          <MyServicesContent />
        </div>
      </div>
    </MyServicesProvider>
  );
}
