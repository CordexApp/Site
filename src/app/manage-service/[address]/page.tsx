"use client";

import BondingCurveSetup from "@/components/BondingCurveSetup";
import ContractActivation from "@/components/ContractActivation";
import ContractStatusIndicator from "@/components/ContractStatusIndicator";
import ServiceHealthIndicator from "@/components/ServiceHealthIndicator";
import { CopyableHash } from "@/components/ui/CopyableHash";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { TypedText } from "@/components/ui/TypedText";
import {
    ManageServiceProvider,
    useManageService,
} from "@/context/ManageServiceContext";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";

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
    service,
  } = useManageService();

  const { address: walletAddress } = useAccount();

  // Check if the current user is the owner
  const isOwner = ownerAddress === walletAddress;
  
  // Debugging logs
  console.log("[ManageServiceContent] Bonding curve address:", bondingCurveAddress);
  console.log("[ManageServiceContent] Is owner:", isOwner);
  console.log("[ManageServiceContent] Provider token address:", providerTokenAddress);
  console.log("[ManageServiceContent] Should show bonding curve setup:", !bondingCurveAddress && isOwner && providerTokenAddress);

  // Format maxEscrow from bigint to a readable string
  const escrowAmount = providerContractDetails?.maxEscrow
    ? (Number(providerContractDetails.maxEscrow) / 10 ** 18).toString()
    : null;

  if (isLoading) {
    return (
      <div className="my-8 text-white">
        <LoadingDots text="Loading service details" />
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

  // Get a display name for the service 
  const serviceName = service?.name || providerTokenInfo?.name || `Service ${providerContractAddress?.substring(0, 6)}...`;

  return (
    <div className="flex flex-col gap-4">
      {/* Service title and info */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white mb-2">{serviceName}</h2>
        {isOwner ? (
          <p className="text-green-400 text-sm">You are the owner of this service</p>
        ) : (
          <p className="text-yellow-400 text-sm">You are viewing this service as a non-owner</p>
        )}
      </div>
    
      <StatusIndicators />
      <p>
        <span className="text-gray-400">provider contract:</span>{" "}
        <CopyableHash hash={providerContractAddress || ""} />
      </p>

      <p>
        <span className="text-gray-400">owner:</span>{" "}
        <CopyableHash hash={ownerAddress || ""} />
      </p>

      {providerContractDetails?.apiEndpoint && (
        <p>
          <span className="text-gray-400">endpoint:</span>{" "}
          <span>{providerContractDetails.apiEndpoint}</span>
        </p>
      )}

      {bondingCurveAddress && (
        <div>
          <p>
            <span className="text-gray-400">bonding curve:</span>{" "}
            <CopyableHash hash={bondingCurveAddress} />
          </p>
          <div className="mt-2 px-4 py-2 bg-green-900/20 border border-green-800/30 rounded-md">
            <p className="text-sm text-green-400">
              Your service has a bonding curve deployed. Users can now buy and sell your service tokens.
            </p>
          </div>
        </div>
      )}

      {providerTokenInfo && (
        <p>
          <span className="text-gray-400">token:</span>{" "}
          <span className="text-sm">
            {providerTokenInfo.name} ({providerTokenInfo.symbol})
          </span>
        </p>
      )}

      {providerTokenAddress && (
        <p>
          <span className="text-gray-400">token address:</span>{" "}
          <CopyableHash hash={providerTokenAddress} />
        </p>
      )}

      <p>
        <span className="text-gray-400">escrow amount:</span>{" "}
        <span className="text-sm">
          {escrowAmount ? `${escrowAmount} CRDX` : "Not available"}
        </span>
      </p>
      
      {/* Service Management Components */}
      <div className="mt-4">
        <h3 className="text-xl font-semibold mb-4">Service Management</h3>
        
        {/* Contract Activation - always show */}
        <ContractActivation />
        
        {/* Bonding Curve Setup - only show if no bonding curve exists and user is owner */}
        {/* This is a strict check: only render if there is explicitly no bonding curve */}
        {bondingCurveAddress === null && isOwner && providerTokenAddress && (
          <div className="mt-4">
            <BondingCurveSetup />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIndicators() {
  const { providerContractAddress, providerContractDetails } =
    useManageService();

  return (
    <div className="flex gap-4 mb-4">
      {providerContractAddress && (
        <ContractStatusIndicator contractAddress={providerContractAddress} />
      )}
      {providerContractDetails?.apiEndpoint && (
        <ServiceHealthIndicator
          endpoint={providerContractDetails.apiEndpoint}
        />
      )}
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
      <div className="">
        <h1 className="text-2xl font-bold mb-6">
          <TypedText text="manage your service" />
        </h1>
        <div className="w-full max-w-4xl">
          <ManageServiceContent />
        </div>
      </div>
    </ManageServiceProvider>
  );
}
