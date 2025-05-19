"use client";

import { ServiceManagementCard } from "@/components/ServiceManagementCard";
import { LoadingDots } from "@/components/ui";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { TypedText } from "@/components/ui/TypedText";
import { MyServicesProvider, useMyServices } from "@/context/MyServicesContext";

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
      <div className="my-8 text-cordex-red">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="my-8 p-8 border border-gray-800 text-center">
        <p className="mb-4">You don't have any active services yet.</p>
        <SecondaryButton href="/launch">
          Launch a new service
        </SecondaryButton>
      </div>
    );
  }

  return (
    <div className="my-8">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 border border-gray-800 bg-black/20">
          <p className="text-gray-400 text-xs mb-1">Total Services</p>
          <p className="text-xl font-mono">{services.length}</p>
        </div>
        <div className="p-4 border border-gray-800 bg-black/20">
          <p className="text-gray-400 text-xs mb-1">Active</p>
          <p className="text-xl font-mono">{services.filter(s => s.isActive).length}</p>
        </div>
      </div>
      
      {/* Services list */}
      <div className="grid grid-cols-1 gap-4">
        {services.map((service) => (
          <div 
            key={service.providerContractAddress}
            className="border border-gray-800 rounded-md bg-black/30 hover:bg-black/40 transition-colors duration-200"
          >
            <ServiceManagementCard service={service} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyServicesPage() {
  return (
    <MyServicesProvider>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] py-12 px-6 font-mono bg-black text-white max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          <TypedText text="my services" />
        </h1>
        <p className="text-gray-400 mb-8">Manage your deployed services and bonding curves</p>
        <div className="w-full">
          <MyServicesContent />
        </div>
      </div>
    </MyServicesProvider>
  );
}
