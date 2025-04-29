"use client";

import { BondingCurve } from "@/hooks/useMyContracts"; // Type import should still work

interface BondingCurveListProps {
  bondingCurves: BondingCurve[];
  selectedCurve: `0x${string}` | null;
  setSelectedCurve: (address: `0x${string}` | null) => void;
  withdrawFees: (address: `0x${string}`) => void;
  isPending: boolean; // From useWriteContract (for any action)
  isWaitingForReceipt: boolean; // From useWaitForTransactionReceipt
}

// Simple helper to shorten addresses
const shorten = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(addr.length - 4)}` : "";

export default function BondingCurveList({
  bondingCurves,
  selectedCurve,
  setSelectedCurve,
  withdrawFees,
  isPending,
  isWaitingForReceipt,
}: BondingCurveListProps) {
  const isWithdrawDisabled = (curve: BondingCurve) =>
    isPending || isWaitingForReceipt || parseFloat(curve.accumulatedFees) <= 0;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold border-b border-gray-700 pb-2 mb-4">
        your bonding curves
      </h2>
      {bondingCurves.length > 0 ? (
        <div className="space-y-4">
          {bondingCurves.map((curve) => (
            <div
              key={curve.address}
              className={`p-4 border rounded-md transition-colors duration-150 ${
                selectedCurve === curve.address
                  ? "border-blue-500 bg-gray-900"
                  : "border-gray-700"
              }`}
            >
              <h3 className="font-bold text-lg">
                {curve.tokenName} ({curve.tokenSymbol}) Bonding Curve
              </h3>
              <p className="text-sm text-gray-400 mb-1 break-all">
                curve address: {curve.address}
              </p>
              <p className="text-sm text-gray-400 mb-1 break-all">
                token address: {curve.tokenAddress}
              </p>
              <p className="text-sm mb-1">
                token supply in curve: {curve.tokenSupply} {curve.tokenSymbol}
              </p>
              <p className="text-sm mb-3">
                accumulated fees: {curve.accumulatedFees} CRDX
              </p>

              {selectedCurve !== curve.address ? (
                <button
                  onClick={() => setSelectedCurve(curve.address)}
                  className="text-sm border border-gray-600 hover:border-white px-3 py-1 rounded transition-colors duration-150"
                >
                  manage
                </button>
              ) : (
                <div className="border-t border-gray-600 pt-3 mt-3">
                  <h4 className="text-md font-semibold mb-2">manage curve</h4>
                  <div className="flex flex-col space-y-2 items-start">
                    <button
                      onClick={() => withdrawFees(curve.address)}
                      disabled={isWithdrawDisabled(curve)}
                      className={`text-sm border px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ${
                        !isWithdrawDisabled(curve)
                          ? "border-green-800 hover:border-green-500 text-green-300 hover:text-green-100"
                          : "border-gray-600 text-gray-500"
                      }`}
                    >
                      {isPending && selectedCurve === curve.address
                        ? "submitting..."
                        : isWaitingForReceipt && selectedCurve === curve.address
                        ? "processing..."
                        : parseFloat(curve.accumulatedFees) > 0
                        ? `withdraw ${curve.accumulatedFees} CRDX fees`
                        : "no fees to withdraw"}
                    </button>

                    <button
                      onClick={() => setSelectedCurve(null)}
                      className="text-sm border border-gray-600 hover:border-white px-3 py-1 rounded transition-colors duration-150 mt-2"
                    >
                      close management
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 italic">no bonding curves found.</p>
      )}
    </div>
  );
}
