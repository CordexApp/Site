"use client";

import {
  MyContractsProvider,
  useMyContractsContext,
} from "@/context/MyContractsContext";
import TokenList from "@/components/MyContracts/TokenList";
import BondingCurveList from "@/components/MyContracts/BondingCurveList";
import StatusDisplay from "@/components/MyContracts/StatusDisplay";
import ActionLinks from "@/components/MyContracts/ActionLinks";

// Inner component to access context after provider
function MyContractsContent() {
  const {
    isLoading,
    isConnected,
    providerTokens,
    bondingCurves,
    selectedCurve,
    setSelectedCurve,
    actionStatus,
    errorMessage,
    successMessage,
    txHash,
    isPending,
    isWaitingForReceipt,
    withdrawFees,
    refreshData,
  } = useMyContractsContext();

  // Loading state or connect wallet prompt
  if (!isConnected || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)]">
        <div className="animate-pulse text-xl text-gray-400">
          {isLoading
            ? "loading your contracts..."
            : "please connect your wallet"}
        </div>
      </div>
    );
  }

  // Function to dismiss status messages
  const dismissStatus = () => {
    // The refreshData function already resets the status, use it directly
    // Or, if finer control needed, add a dedicated reset function to the hook/context
    refreshData(); // Re-calling refresh clears status and refetches data
    // Alternatively, add `setActionStatus('idle')` to context and call it here.
  };

  return (
    <>
      <div className="flex justify-between items-center w-full mb-8">
        <h1 className="text-3xl font-bold">my contracts</h1>
        <button
          onClick={refreshData}
          disabled={isLoading || isPending || isWaitingForReceipt} // Disable refresh during loading/actions
          className="text-sm border border-gray-600 hover:border-white px-3 py-1 rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "loading..." : "refresh data"}
        </button>
      </div>

      {/* Display Status Messages */}
      <StatusDisplay
        actionStatus={actionStatus}
        errorMessage={errorMessage}
        successMessage={successMessage}
        txHash={txHash}
        dismiss={dismissStatus}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Provider Tokens */}
        <TokenList
          providerTokens={providerTokens}
          bondingCurves={bondingCurves}
        />

        {/* Bonding Curves */}
        <BondingCurveList
          bondingCurves={bondingCurves}
          selectedCurve={selectedCurve}
          setSelectedCurve={setSelectedCurve}
          withdrawFees={withdrawFees}
          isPending={isPending}
          isWaitingForReceipt={isWaitingForReceipt}
        />
      </div>

      {/* Action Links */}
      <ActionLinks />
    </>
  );
}

// Main page component
export default function MyContractsPage() {
  console.log("MyContractsPage rendering");

  return (
    <MyContractsProvider>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-12 lg:px-24 xl:px-32 py-12 font-mono bg-black text-white">
        <MyContractsContent />
      </div>
    </MyContractsProvider>
  );
}
