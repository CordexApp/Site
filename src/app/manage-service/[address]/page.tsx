"use client";

import { useParams } from "next/navigation";
import {
  ManageServiceProvider,
  useManageService,
} from "@/context/ManageServiceContext";
import ContractActivation from "@/components/ContractActivation";
import BondingCurveSetup from "@/components/BondingCurveSetup";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { TypedText } from "@/components/ui/TypedText";
import { CopyableHash } from "@/components/ui/CopyableHash";
import ServiceHealthIndicator from "@/components/ServiceHealthIndicator";
import ContractStatusIndicator from "@/components/ContractStatusIndicator";

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

  return (
    <div className="flex flex-col gap-4">
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
        <p>
          <span className="text-gray-400">bonding curve:</span>{" "}
          <CopyableHash hash={bondingCurveAddress} />
        </p>
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
      {/* Only show these components when service data is loaded */}
      <ContractActivation />
      <BondingCurveSetup />
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
        <h1 className="">
          <TypedText text="manage your service" />
        </h1>
        <div className="w-full max-w-4xl">
          <ManageServiceContent />
        </div>
      </div>
    </ManageServiceProvider>
  );
}
