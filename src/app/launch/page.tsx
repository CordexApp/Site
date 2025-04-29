"use client";

import ServiceForm from "@/components/ServiceForm";
import DeploymentStatus from "@/components/DeploymentStatus";
import { useServiceLaunch } from "@/context/ServiceLaunchContext";
import { TypedText } from "@/components/ui/TypedText";
export default function LaunchService() {
  const { deploymentStatus } = useServiceLaunch();

  return (
    <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] py-12 font-mono bg-black text-white">
      <h1 className="text-3xl font-bold mb-4">
        <TypedText
          text={
            deploymentStatus === "success"
              ? "service deployed"
              : "launch your service"
          }
        />
      </h1>

      <div className="w-full max-w-lg">
        {deploymentStatus !== "success" && <ServiceForm />}
        <DeploymentStatus />
      </div>
    </div>
  );
}
