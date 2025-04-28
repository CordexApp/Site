"use client";

import { useService } from "@/context/ServiceContext";
import ContractStatusIndicator from "./ContractStatusIndicator";

export default function ContractStatusWrapper() {
  const { service } = useService();
  const contractAddress = service?.provider_contract_address || "";

  console.log(
    "[ContractStatusWrapper] Rendering contract status for:",
    contractAddress
  );

  if (!contractAddress) {
    return (
      <div className="flex items-center">
        <div className="h-3 w-3 rounded-full bg-gray-400 mr-2"></div>
        <span className="text-sm text-gray-400">No contract linked</span>
      </div>
    );
  }

  return <ContractStatusIndicator contractAddress={contractAddress} />;
}
