"use client";

import { useEffect } from "react";
import ServiceForm from "@/components/ServiceForm";
import DeploymentStatus from "@/components/DeploymentStatus";
import ContractActivation from "@/components/ContractActivation";
import {
  ServiceLaunchProvider,
  useServiceLaunch,
} from "@/context/ServiceLaunchContext";

// Just show deployment details instead of handling registration
function DeploymentInfo() {
  const { deploymentStatus, contractAddresses } = useServiceLaunch();

  // Log when deployment is successful
  useEffect(() => {
    if (deploymentStatus === "success") {
      console.log("Deployment completed successfully");
      console.log("Deployed contract addresses:");
      console.log("- Provider Contract:", contractAddresses.providerContract);
      console.log("- Coin Contract:", contractAddresses.coinContract);
    }
  }, [deploymentStatus, contractAddresses]);

  return null;
}

export default function LaunchService() {
  console.log("LaunchService component rendering");

  return (
    <ServiceLaunchProvider>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-12 font-mono bg-black text-white">
        <h1 className="text-3xl font-bold mb-8">launch your service</h1>

        <div className="w-full max-w-lg">
          <ServiceForm />
          <DeploymentStatus />
          <ContractActivation />
          <DeploymentInfo />
        </div>
      </div>
    </ServiceLaunchProvider>
  );
}
