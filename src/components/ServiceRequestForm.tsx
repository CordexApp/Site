"use client";

import { useState, useEffect } from "react";
import { makeApiRequest } from "@/services/contractServices";
import { PrimaryButton } from "./ui/PrimaryButton";
import useApiTokenGeneration from "@/hooks/useApiTokenGeneration";
import { useService } from "@/context/ServiceContext";

interface ServiceRequestFormProps {
  serviceName: string;
  endpoint: string;
  providerContractAddress: string;
}

export default function ServiceRequestForm({
  serviceName,
  endpoint,
  providerContractAddress,
}: ServiceRequestFormProps) {
  const [requestInput, setRequestInput] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Get maxEscrow from context
  const { maxEscrow } = useService();

  const {
    tokenHash,
    isCheckingAllowance,
    isApproving,
    needsApproval,
    isGenerating,
    isPending,
    isConfirming,
    isSuccess: isTokenGenerationSuccess,
    error,
    approvalTransactionHash,
    generateTransactionHash,
    generateToken,
    approveSpending,
    resetToken,
  } = useApiTokenGeneration();

  useEffect(() => {
    console.log("[ServiceRequestForm] Hook state:", {
      tokenHash,
      isCheckingAllowance,
      isApproving,
      needsApproval,
      isGenerating,
      isPending,
      isConfirming,
      isTokenGenerationSuccess,
      error,
      approvalTransactionHash,
      generateTransactionHash,
    });
  }, [
    tokenHash,
    isCheckingAllowance,
    isApproving,
    needsApproval,
    isGenerating,
    isPending,
    isConfirming,
    isTokenGenerationSuccess,
    error,
    approvalTransactionHash,
    generateTransactionHash,
  ]);

  // Reset API response when token is regenerated or reset
  useEffect(() => {
    if (isGenerating || !tokenHash) {
      setResponse(null);
    }
  }, [isGenerating, tokenHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponse(null); // Clear previous response

    if (!requestInput.trim()) {
      console.log("[ServiceRequestForm] Empty request input");
      return;
    }

    if (!providerContractAddress || !maxEscrow) {
      console.error(
        "[ServiceRequestForm] Missing contract address or maxEscrow"
      );
      return;
    }

    // If we have a token, make the API request directly
    if (tokenHash) {
      console.log(
        "[ServiceRequestForm] Token available, making API request...",
        tokenHash
      );
      setIsLoadingApi(true);
      try {
        const result = await makeApiRequest(endpoint, tokenHash, {
          query: requestInput,
        });
        console.log("[ServiceRequestForm] API response received:", result);
        setResponse(result);
      } catch (err) {
        console.error("[ServiceRequestForm] API request failed:", err);
        setResponse({ error: "API request failed." });
      } finally {
        setIsLoadingApi(false);
      }
      return;
    }

    // If no token, check if approval is needed first
    if (needsApproval) {
      console.log(
        "[ServiceRequestForm] Approval needed, calling approveSpending"
      );
      await approveSpending(
        providerContractAddress as `0x${string}`,
        maxEscrow
      );
      return;
    }

    // If no token and approval is NOT needed (or already done), generate token
    console.log(
      "[ServiceRequestForm] No token, initiating token generation..."
    );
    await generateToken(providerContractAddress as `0x${string}`, maxEscrow);
  };

  // Determine button text and status text
  let buttonText = "Send Request";
  let statusText = "";
  const isProcessing =
    isCheckingAllowance ||
    isApproving ||
    isGenerating ||
    isPending ||
    isConfirming ||
    isLoadingApi;

  if (!tokenHash) {
    if (needsApproval) {
      buttonText = "Approve CRDX";
    } else {
      buttonText = "Generate Token & Send Request";
    }
  }

  if (isCheckingAllowance) {
    statusText = "Checking allowance...";
  } else if (isApproving) {
    statusText = "Requesting approval...";
  } else if (isGenerating) {
    statusText = "Generating token...";
  } else if (isPending) {
    statusText = "Waiting for wallet...";
  } else if (isConfirming) {
    statusText = "Confirming transaction...";
  } else if (isLoadingApi) {
    statusText = "Sending API request...";
  }

  return (
    <div className="mt-8 w-full">
      <h2 className="text-xl font-semibold mb-4">Send API Request</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="request"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Request Payload (Requires {maxEscrow ? `${maxEscrow} CRDX` : "N/A"}{" "}
            escrow)
          </label>
          <textarea
            id="request"
            className="w-full p-2 bg-black border border-gray-700 rounded-md text-white"
            rows={4}
            value={requestInput}
            onChange={(e) => setRequestInput(e.target.value)}
            placeholder='e.g., { "prompt": "Generate a cool image" }'
            disabled={isProcessing}
          />
        </div>

        <div>
          <PrimaryButton
            type="submit"
            disabled={isProcessing || !requestInput.trim() || !maxEscrow}
          >
            {buttonText}
          </PrimaryButton>

          {isProcessing && (
            <span className="ml-3 text-gray-400">{statusText}</span>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            Error:{" "}
            {error.split("Details:")[0] || error.split("Reason:")[0] || error}
          </div>
        )}

        {/* Approval Transaction hash link */}
        {approvalTransactionHash && (
          <div className="mt-3 text-sm">
            Approval Tx:{" "}
            <a
              href={`https://sepolia-optimism.etherscan.io/tx/${approvalTransactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative text-white font-medium group inline-block underline"
            >
              view on etherscan
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </a>
          </div>
        )}

        {/* Generate Transaction hash link */}
        {generateTransactionHash && (
          <div className="mt-3 text-sm">
            Generate Tx:{" "}
            <a
              href={`https://sepolia-optimism.etherscan.io/tx/${generateTransactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative text-white font-medium group inline-block underline"
            >
              view on etherscan
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </a>
          </div>
        )}
      </form>

      {response && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">API Response:</h3>
          <pre className="bg-black p-4 rounded-md overflow-x-auto text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
