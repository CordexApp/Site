"use client";

import { useService } from "@/context/ServiceContext";
import ContractMaxEscrowIndicator from "./ContractMaxEscrowIndicator";

export default function ContractMaxEscrowWrapper() {
  const { service } = useService();
  const contractAddress = service?.provider_contract_address || "";

  console.log(
    "[ContractMaxEscrowWrapper] Rendering max escrow for contract:",
    contractAddress
  );

  if (!contractAddress) {
    return (
      <div className="flex items-center">
        <span className="text-sm text-gray-400">No contract linked</span>
      </div>
    );
  }

  return <ContractMaxEscrowIndicator contractAddress={contractAddress} />;
}
