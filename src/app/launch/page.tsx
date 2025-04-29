"use client";

import ServiceForm from "@/components/ServiceForm";
import DeploymentStatus from "@/components/DeploymentStatus";
import { ServiceLaunchProvider } from "@/context/ServiceLaunchContext";

export default function LaunchService() {
  return (
    <ServiceLaunchProvider>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-12 font-mono bg-black text-white">
        <h1 className="text-3xl font-bold mb-8">launch your service</h1>

        <div className="w-full max-w-lg">
          <ServiceForm />
          <DeploymentStatus />
        </div>
      </div>
    </ServiceLaunchProvider>
  );
}
