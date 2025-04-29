"use client";

import { useBondingCurveSetup } from "@/hooks/useBondingCurveSetup";
import { formatEther } from "viem";

export default function BondingCurveSetup() {
  const {
    // States
    percentage,
    setPercentage,
    tokenBalance,
    allowance,
    isLoading,
    error,
    contextLoading,
    isOwner,
    bondingCurveAddress,
    providerTokenAddress,

    // Computed values
    initialTokenAmount,
    allowanceEnough,
    formattedBalance,
    formattedInitialAmount,

    // Transaction states
    isApproving,
    isDeploying,
    isProcessing,
    isApproveTxConfirming,
    isApproveTxConfirmed,
    isDeployTxConfirming,
    isDeployTxConfirmed,
    isDeployPending,
    isApprovePending,

    // Handlers
    handleApprove,
    handleDeploy,

    // Utilities
    shorten,
  } = useBondingCurveSetup();

  // Only show for the owner and if context is loaded
  if (contextLoading || !isOwner) {
    return null;
  }

  // If checking or loading
  if (isLoading) {
    return (
      <div className="mt-8 border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold mb-4">Set up Bonding Curve</h2>
        <p>Loading token details...</p>
      </div>
    );
  }

  // If bonding curve already deployed
  if (bondingCurveAddress || isDeployTxConfirmed) {
    return (
      <div className="mt-8 border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold mb-4">Bonding Curve Deployed</h2>
        <p className="text-green-400">
          Your bonding curve is active at:{" "}
          {shorten(bondingCurveAddress || "0x")}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Users can now buy your provider tokens using CRDX through this bonding
          curve.
        </p>
      </div>
    );
  }

  // Otherwise show the setup form
  return (
    <div className="mt-8 border-t border-gray-700 pt-8">
      <h2 className="text-2xl font-bold mb-4">Set up Bonding Curve</h2>

      {providerTokenAddress ? (
        <>
          {/* Display token balance */}
          <p className="mb-4">Your token balance: {formattedBalance} tokens</p>

          {/* Deposit */}
          <label className="block mb-2">
            Deposit to Bonding Curve (% of balance)
          </label>
          <input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            min="1"
            max="90"
            disabled={isProcessing}
            className={`w-full p-2 mb-1 ${
              isProcessing ? "bg-gray-600" : "text-black"
            }`}
          />
          <p className="text-sm text-gray-400 mb-4">
            This will deposit approximately {formattedInitialAmount} tokens into
            your bonding curve
          </p>

          {/* Fixed Parameters */}
          <div className="mb-4 p-3 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">
              Bonding Curve Parameters (Fixed)
            </h3>
            <p className="text-sm">Slope: 0.0001 CRDX</p>
            <p className="text-sm">Intercept: 0.01 CRDX</p>
            <p className="text-sm text-gray-400 mt-2">
              These parameters create a fair pricing model for your token
            </p>
          </div>

          {/* Status messages */}
          {isApproveTxConfirming && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-blue-400">
              Confirming token approval...
            </div>
          )}

          {isApprovePending && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-blue-400">
              Submitting approval transaction...
            </div>
          )}

          {isDeployTxConfirming && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-blue-400">
              Confirming bonding curve deployment...
            </div>
          )}

          {isDeployPending && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-blue-400">
              Submitting deployment transaction...
            </div>
          )}

          {/* Error display */}
          {error && !isProcessing && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-400">
              {error}
            </div>
          )}

          {/* Allowance & actions */}
          <p className="mb-4">
            Current allowance: {formatEther(allowance).split(".")[0]} tokens
            {!allowanceEnough && !isApproveTxConfirmed && (
              <span className="text-yellow-400 ml-2">
                (Need {formattedInitialAmount} tokens)
              </span>
            )}
          </p>

          {!allowanceEnough && !isDeploying && (
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className={`bg-blue-600 px-4 py-2 rounded mr-4 ${
                isProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-500"
              }`}
            >
              {isApproving
                ? isApproveTxConfirming
                  ? "Confirming Approval..."
                  : "Approving..."
                : `Approve Factory (allow ${formattedInitialAmount} tokens)`}
            </button>
          )}

          {(allowanceEnough || isApproveTxConfirmed) && !isApproving && (
            <button
              onClick={handleDeploy}
              disabled={isProcessing}
              className={`bg-green-600 px-4 py-2 rounded ${
                isProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-500"
              }`}
            >
              {isDeploying
                ? isDeployTxConfirming
                  ? "Confirming Deployment..."
                  : "Deploying Bonding Curve..."
                : `Deploy Bonding Curve (${formattedInitialAmount} tokens)`}
            </button>
          )}
        </>
      ) : (
        <p className="text-yellow-400">
          No provider token found. Please ensure your service is deployed
          correctly.
        </p>
      )}
    </div>
  );
}
