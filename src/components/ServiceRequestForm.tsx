"use client";

import { useState, useEffect } from "react";
import { makeApiRequest } from "@/services/contractServices";
import { PrimaryButton } from "./ui/PrimaryButton";
import { LoadingDots } from "./ui/LoadingDots";
import useApiTokenGeneration from "@/hooks/useApiTokenGeneration";
import { useService } from "@/context/ServiceContext";
import { Input, InputLabel } from "./ui";

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
  let buttonText = "send";
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
      buttonText = "approve crdx";
    } else {
      buttonText = "generate & send";
    }
  }

  if (isCheckingAllowance) {
    statusText = "checking";
  } else if (isApproving) {
    statusText = "approving";
  } else if (isGenerating) {
    statusText = "generating";
  } else if (isPending) {
    statusText = "waiting";
  } else if (isConfirming) {
    statusText = "confirming";
  } else if (isLoadingApi) {
    statusText = "sending";
  }

  return (
    <div className="mt-8 w-full">
      <h3 className="">interact with {serviceName}</h3>
      <div className="text-xs text-gray-400 mb-2">
        max price {maxEscrow} CRDX
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <InputLabel>prompt</InputLabel>
          <Input
            id="request"
            className="w-full"
            value={requestInput}
            onChange={(e) => setRequestInput(e.target.value)}
            placeholder="generate image of..."
            disabled={isProcessing}
          />
        </div>

        <div>
          <PrimaryButton
            type="submit"
            disabled={isProcessing || !requestInput.trim() || !maxEscrow}
          >
            {isProcessing ? (
              <LoadingDots text={statusText.toLowerCase()} />
            ) : (
              buttonText.toLowerCase()
            )}
          </PrimaryButton>
        </div>

        {error && (
          <div className="text-cordex-red text-sm mt-2">
            error:{" "}
            {(
              error.split("Details:")[0] ||
              error.split("Reason:")[0] ||
              error
            ).toLowerCase()}
          </div>
        )}

        {/* Approval Transaction hash link */}
        {approvalTransactionHash && (
          <div className="mt-3 text-sm">
            tx:{" "}
            <a
              href={`https://sepolia-optimism.etherscan.io/tx/${approvalTransactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative text-white font-medium group inline-block underline"
            >
              etherscan
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </a>
          </div>
        )}

        {/* Generate Transaction hash link */}
        {generateTransactionHash && (
          <div className="mt-3 text-sm">
            tx:{" "}
            <a
              href={`https://sepolia-optimism.etherscan.io/tx/${generateTransactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative text-white font-medium group inline-block underline"
            >
              etherscan
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </a>
          </div>
        )}
      </form>

      {response && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">response:</h3>
          <pre className="bg-black p-4 overflow-x-auto text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
