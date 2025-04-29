"use client";

import { ActionStatus } from "@/hooks/useMyContracts"; // Type import should still work

interface StatusDisplayProps {
  actionStatus: ActionStatus;
  errorMessage: string;
  successMessage: string;
  txHash: `0x${string}` | undefined;
  dismiss: () => void; // Function to reset status to 'idle'
}

// TODO: Update with correct Etherscan URL for the target network (e.g., Sepolia Optimism)
const ETHERSCAN_BASE_URL = "https://sepolia-optimism.etherscan.io";

export default function StatusDisplay({
  actionStatus,
  errorMessage,
  successMessage,
  txHash,
  dismiss,
}: StatusDisplayProps) {
  // Don't render anything if status is idle or executing (handled by button states)
  if (actionStatus === "idle" || actionStatus === "executing") {
    return null;
  }

  const isError = actionStatus === "error";
  const message = isError ? errorMessage : successMessage;
  const borderColor = isError ? "border-red-500" : "border-green-500";
  const textColor = isError ? "text-red-400" : "text-green-400";
  const title = isError ? "error" : "success";

  return (
    <div
      className={`mt-6 mb-4 p-4 border ${borderColor} ${textColor} rounded-md w-full max-w-2xl`}
    >
      <div className="flex justify-between items-center mb-2">
        <p className="font-bold capitalize text-lg">{title}</p>
        <button
          onClick={dismiss}
          className="text-sm text-gray-400 hover:text-white"
          aria-label="Dismiss notification"
        >
          &times; {/* Multiplication sign as close icon */}
        </button>
      </div>
      <p className="text-sm break-words">
        {message ||
          (isError ? "An unknown error occurred." : "Action completed.")}
      </p>
      {txHash && (
        <div className="mt-3">
          <a
            href={`${ETHERSCAN_BASE_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            view transaction on etherscan
          </a>
        </div>
      )}
    </div>
  );
}
