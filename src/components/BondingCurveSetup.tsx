"use client";

import useBondingCurveSetup from "@/hooks/useBondingCurveSetup";
import { useServiceLaunch } from "@/context/ServiceLaunchContext";

// Simple helper to shorten addresses
const shorten = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(addr.length - 4)}`;

export default function BondingCurveSetup() {
  const { deploymentStatus } = useServiceLaunch();
  const {
    providerToken,
    percentage,
    setPercentage,
    formattedBalance,
    formattedInitialAmount,
    allowanceEnough,
    allowanceDisplay,
    status,
    isPending,
    isWaitingReceipt,
    existingBondingCurve,
    bondingCurveAddress,
    checkingExistence,
    handleApprove,
    handleDeploy,
  } = useBondingCurveSetup();

  if (deploymentStatus !== "success") return null;

  if (checkingExistence) {
    return (
      <div className="mt-8 border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold mb-4">Set up Bonding Curve</h2>
        <p>Checking if you already have a bonding curve...</p>
      </div>
    );
  }

  if (existingBondingCurve || bondingCurveAddress) {
    return (
      <div className="mt-8 border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold mb-4">Bonding Curve Deployed</h2>
        <p className="text-green-400">
          Your bonding curve is active at:{" "}
          {shorten(bondingCurveAddress || (existingBondingCurve as string))}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Users can now buy your provider tokens using CRDX through this bonding
          curve.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-gray-700 pt-8">
      <h2 className="text-2xl font-bold mb-4">Set up Bonding Curve</h2>

      {providerToken && (
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
            className="w-full p-2 mb-1 text-black"
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

          {/* Allowance & actions */}
          <p className="mb-4">
            Current allowance: {allowanceDisplay} tokens
            {!allowanceEnough && (
              <span className="text-yellow-400 ml-2">
                (Need {formattedInitialAmount} tokens)
              </span>
            )}
          </p>

          {!allowanceEnough && (
            <button
              onClick={handleApprove}
              disabled={isPending || isWaitingReceipt || status === "approving"}
              className="bg-blue-600 px-4 py-2 rounded mr-4"
            >
              {status === "approving"
                ? "Approving..."
                : `Approve Factory (allow ${formattedInitialAmount} tokens)`}
            </button>
          )}

          {allowanceEnough && (
            <button
              onClick={handleDeploy}
              disabled={isPending || isWaitingReceipt || status === "deploying"}
              className="bg-green-600 px-4 py-2 rounded"
            >
              {status === "deploying"
                ? "Deploying Bonding Curve..."
                : `Deploy Bonding Curve (${formattedInitialAmount} tokens)`}
            </button>
          )}

          {/* Feedback */}
          {status === "error" && (
            <p className="mt-4 text-red-400">
              Something went wrong. Check console.
            </p>
          )}
        </>
      )}
    </div>
  );
}
