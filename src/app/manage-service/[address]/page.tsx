"use client";

import { useParams } from "next/navigation";
import {
  ManageServiceProvider,
  useManageService,
} from "@/context/ManageServiceContext";
import ContractActivation from "@/components/ContractActivation";
import BondingCurveSetup from "@/components/BondingCurveSetup";
import { LoadingDots } from "@/components/ui/LoadingDots";

// Inner component that uses the context
function ManageServiceContent() {
  const {
    isLoading,
    error,
    providerContractAddress,
    ownerAddress,
    providerContractDetails,
    providerTokenAddress,
    providerTokenInfo,
    bondingCurveAddress,
  } = useManageService();

  if (isLoading) {
    return (
      <div className="my-8 text-white">
        <LoadingDots text="Loading service details" />
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

  return (
    <div className="mt-8">
      <div className="mb-8 pb-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Service Details</h2>
        <p className="mb-2">
          <span className="text-gray-400">Provider Contract:</span>{" "}
          {providerContractAddress}
        </p>
        <p className="mb-2">
          <span className="text-gray-400">Owner:</span>{" "}
          {ownerAddress || "Unknown"}
        </p>
        {providerContractDetails && (
          <>
            <p className="mb-2">
              <span className="text-gray-400">API Endpoint:</span>{" "}
              {providerContractDetails.apiEndpoint || "Not set"}
            </p>
            <p className="mb-2">
              <span className="text-gray-400">Max Escrow:</span>{" "}
              {providerContractDetails.maxEscrow
                ? (
                    Number(providerContractDetails.maxEscrow) /
                    10 ** 18
                  ).toString()
                : "0"}{" "}
              CRDX
            </p>
            <p className="mb-2">
              <span className="text-gray-400">Status:</span>{" "}
              <span
                className={
                  providerContractDetails.isActive
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {providerContractDetails.isActive ? "Active" : "Inactive"}
              </span>
            </p>
          </>
        )}
        {providerTokenInfo && (
          <p className="mb-2">
            <span className="text-gray-400">Token:</span>{" "}
            {providerTokenInfo.name} ({providerTokenInfo.symbol})
          </p>
        )}
      </div>

      {/* Only show these components when service data is loaded */}
      <ContractActivation />
      <BondingCurveSetup />
    </div>
  );
}

export default function ManageServicePage() {
  const params = useParams();
  const address = params.address as string;

  // Ensure the address is properly formatted as 0x prefixed
  const formattedAddress = address.startsWith("0x")
    ? (address as `0x${string}`)
    : (`0x${address}` as `0x${string}`);

  return (
    <ManageServiceProvider serviceAddress={formattedAddress}>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] py-12 font-mono bg-black text-white">
        <h1 className="text-3xl font-bold mb-8">manage your service</h1>
        <div className="w-full max-w-lg">
          <ManageServiceContent />
        </div>
      </div>
    </ManageServiceProvider>
  );
}
