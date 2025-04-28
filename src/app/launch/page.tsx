"use client";

import { useEffect } from "react";
import ServiceForm from "@/components/ServiceForm";
import DeploymentStatus from "@/components/DeploymentStatus";
import ContractActivation from "@/components/ContractActivation";
import {
  ServiceLaunchProvider,
  useServiceLaunch,
} from "@/context/ServiceLaunchContext";

// This component handles the service registration after successful deployment
function ServiceRegistration() {
  const {
    deploymentStatus,
    txHash,
    serviceName,
    apiEndpoint,
    uploadedImageUrl,
    registerService,
    contractAddresses,
  } = useServiceLaunch();

  // Process transaction receipt when successful
  useEffect(() => {
    const handleSuccessfulDeployment = async () => {
      if (deploymentStatus === "success" && txHash) {
        try {
          console.log(
            "Preparing to register service with contracts:",
            contractAddresses
          );

          // Get contract addresses
          const providerContractAddress =
            contractAddresses.providerContract || "0x";
          const coinContractAddress = contractAddresses.coinContract;

          // Register service with the backend
          await registerService(
            serviceName,
            apiEndpoint,
            uploadedImageUrl,
            providerContractAddress,
            coinContractAddress
          );

          console.log("Service registration complete with contracts:", {
            provider: providerContractAddress,
            coin: coinContractAddress,
          });

          // Additional logging of all addresses
          console.log("All deployed contract addresses:");
          console.log(
            "- Provider Contract:",
            contractAddresses.providerContract
          );
          console.log("- Coin Contract:", contractAddresses.coinContract);
        } catch (error) {
          console.error("Error during service registration:", error);
        }
      }
    };

    handleSuccessfulDeployment();
  }, [
    deploymentStatus,
    txHash,
    registerService,
    serviceName,
    apiEndpoint,
    uploadedImageUrl,
    contractAddresses,
  ]);

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
          <ServiceRegistration />
        </div>
      </div>
    </ServiceLaunchProvider>
  );
}
