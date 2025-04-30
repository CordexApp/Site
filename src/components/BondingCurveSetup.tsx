"use client";

import { useBondingCurveSetup } from "@/hooks/useBondingCurveSetup";
import { formatEther } from "viem";
import { NumericInput } from "./ui/NumericInput";
import { PercentageInput } from "./ui/PercentageInput";
import { CommaFormatter } from "./ui/CommaFormatter";
import { LoadingDots } from "./ui/LoadingDots";
import { PrimaryButton } from "./ui/PrimaryButton";
import { useEffect } from "react";
import { CopyableHash } from "./ui/CopyableHash";

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

  // Log errors to console
  useEffect(() => {
    if (error) {
      console.log(error);
    }
  }, [error]);

  // Only show for the owner and if context is loaded
  if (contextLoading || !isOwner) {
    return null;
  }

  // If checking or loading
  if (isLoading) {
    return (
      <div>
        <h3 className="text-lg font-bold mb-4">Set up Bonding Curve</h3>
        <p>Loading token details...</p>
      </div>
    );
  }

  // If bonding curve already deployed
  if (bondingCurveAddress || isDeployTxConfirmed) {
    return (
      <div>
        <p className="text-green-400">
          Your bonding curve is active at:{" "}
          <CopyableHash hash={bondingCurveAddress || "0x"} />
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
    <div>
      <h3>Set up Bonding Curve</h3>

      {providerTokenAddress ? (
        <div className="space-y-4">
          {/* Deposit */}
          <div className="w-64">
            <PercentageInput
              value={percentage}
              label="Deposit to Bonding Curve"
              onChange={(e) => setPercentage(e.target.value)}
              min="1"
              max="99"
              disabled={isProcessing}
            />
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Deposit <CommaFormatter value={formattedInitialAmount} /> of your{" "}
            <CommaFormatter value={formattedBalance} /> tokens
          </p>

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
            <>
              <p className="mb-2">
                First, allow the factory to use your tokens
              </p>
              <PrimaryButton
                onClick={handleApprove}
                disabled={isProcessing}
                className="mr-4"
              >
                {isApproving ? (
                  <LoadingDots
                    text={isApproveTxConfirming ? "Confirming" : "Approving"}
                  />
                ) : (
                  <>Approve</>
                )}
              </PrimaryButton>
            </>
          )}

          {(allowanceEnough || isApproveTxConfirmed) && !isApproving && (
            <>
              <p className="mb-2">
                Deploy with <CommaFormatter value={formattedInitialAmount} />{" "}
                tokens
              </p>
              <PrimaryButton onClick={handleDeploy} disabled={isProcessing}>
                {isDeploying ? (
                  <LoadingDots
                    text={isDeployTxConfirming ? "Confirming" : "Deploying"}
                  />
                ) : (
                  <>Deploy</>
                )}
              </PrimaryButton>
            </>
          )}

          {/* Error display */}
          {error && !isProcessing && <div className="text-red-500">Error</div>}
        </div>
      ) : (
        <p className="text-yellow-400">
          No provider token found. Please ensure your service is deployed
          correctly.
        </p>
      )}
    </div>
  );
}
