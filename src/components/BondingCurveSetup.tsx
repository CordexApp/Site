"use client";

import { useBondingCurveSetup } from "@/hooks/useBondingCurveSetup";
import { InputLabel } from "./ui/InputLabel";
import { LoadingDots } from "./ui/LoadingDots";
import { SecondaryButton } from "./ui/SecondaryButton";

export default function BondingCurveSetup() {
  const {
    providerTokenAddress,
    bondingCurveAddress,
    formattedBalance,
    formattedInitialAmount,
    percentage,
    setPercentage,
    isLoading,
    allowanceEnough,
    isApprovePending,
    isApproveTxConfirming,
    isDeployPending,
    isDeployTxConfirming,
    isDeployTxConfirmed,
    handleApprove,
    handleDeploy,
    error,
  } = useBondingCurveSetup();

  // Debug logging
  console.log("[BondingCurveSetup] bondingCurveAddress:", bondingCurveAddress);
  
  // This component should never be rendered if bondingCurveAddress exists
  if (bondingCurveAddress !== null && bondingCurveAddress !== undefined) {
    console.error("[BondingCurveSetup] Component rendered despite having a bonding curve address:", bondingCurveAddress);
    return null;
  }

  // If loading or no provider token address
  if (isLoading || !providerTokenAddress) {
    return (
      <div className="border border-gray-700 rounded-md p-4">
        <h3 className="text-lg font-medium mb-3">Bonding Curve Setup</h3>
        <div className="text-center py-4">
          <LoadingDots text="Loading token information" />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-md p-4">
      <h3 className="text-lg font-medium mb-3">Deploy Bonding Curve</h3>
      
      <div className="text-sm text-gray-400 mb-4">
        <p className="mb-2">
          Deploy a bonding curve to allow users to buy and sell your service tokens.
          You need to deposit a percentage of your tokens to provide initial liquidity.
        </p>
        <p>
          <span className="font-semibold">Your token balance:</span> {formattedBalance}
        </p>
      </div>

      <div className="mb-4">
        <InputLabel>Percentage of tokens to deposit ({percentage}%)</InputLabel>
        <input
          type="range"
          min="10"
          max="90"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          disabled={isApprovePending || isDeployPending || isApproveTxConfirming || isDeployTxConfirming}
        />
        <p className="text-sm mt-1 text-gray-400">
          Initial deposit: {formattedInitialAmount} tokens ({percentage}%)
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {!allowanceEnough && (
          <SecondaryButton
            onClick={handleApprove}
            className="w-full"
            disabled={isApprovePending || isApproveTxConfirming}
          >
            {isApprovePending || isApproveTxConfirming ? (
              <LoadingDots text={isApproveTxConfirming ? "confirming approval" : "approve tokens"} />
            ) : (
              "1. Approve Tokens"
            )}
          </SecondaryButton>
        )}

        <SecondaryButton
          onClick={handleDeploy}
          className={`w-full ${!allowanceEnough ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!allowanceEnough || isDeployPending || isDeployTxConfirming}
        >
          {isDeployPending || isDeployTxConfirming ? (
            <LoadingDots text={isDeployTxConfirming ? "confirming deployment" : "deploying curve"} />
          ) : (
            allowanceEnough ? "Deploy Bonding Curve" : "2. Deploy Bonding Curve"
          )}
        </SecondaryButton>
      </div>
      
      {isDeployTxConfirmed && (
        <div className="mt-4 bg-green-900/20 border border-green-800/30 rounded-md p-3">
          <p className="text-sm text-green-400">
            Bonding curve deployment confirmed! The page will update shortly.
          </p>
        </div>
      )}
    </div>
  );
} 