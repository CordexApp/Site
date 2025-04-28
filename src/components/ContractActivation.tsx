"use client";

import { useState } from "react";
import { useServiceLaunch } from "@/context/ServiceLaunchContext";

export default function ContractActivation() {
  const [error, setError] = useState("");

  const {
    deploymentStatus,
    contractAddresses,
    activateContract,
    activationStatus, // Use the status from the hook
  } = useServiceLaunch();

  const handleActivate = async () => {
    if (!contractAddresses.providerContract) {
      setError("No contract address available");
      return;
    }

    try {
      await activateContract(contractAddresses.providerContract);
    } catch (err) {
      console.error("Contract activation failed:", err);
      setError(err instanceof Error ? err.message : "Activation failed");
    }
  };

  if (deploymentStatus !== "success") return null;

  return (
    <div className="mt-8 border border-gray-700 rounded-lg p-4">
      <h2 className="text-xl mb-4">Contract Activation</h2>
      <p className="mb-4 text-sm">
        Your contract has been deployed but needs to be activated.
      </p>

      {activationStatus === "success" ? (
        <div className="bg-green-900/20 border border-green-700 p-3 rounded-md text-green-400 mb-4">
          Contract successfully activated!
        </div>
      ) : activationStatus === "error" ? (
        <div className="bg-red-900/20 border border-red-700 p-3 rounded-md text-red-400 mb-4">
          {error || "Failed to activate contract"}
        </div>
      ) : null}

      <button
        disabled={
          activationStatus === "pending" || activationStatus === "success"
        }
        onClick={handleActivate}
        className={`w-full py-3 px-4 rounded-md ${
          activationStatus === "success"
            ? "bg-green-800 cursor-not-allowed"
            : activationStatus === "pending"
            ? "bg-blue-800 cursor-wait"
            : "bg-blue-700 hover:bg-blue-600"
        } transition-colors`}
      >
        {activationStatus === "pending"
          ? "Activating..."
          : activationStatus === "success"
          ? "Contract Activated"
          : "Activate Contract"}
      </button>
    </div>
  );
}
