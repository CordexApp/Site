"use client";

import { useState, useEffect } from "react";
import { PrimaryButton } from "./ui/PrimaryButton";
import { LoadingDots } from "./ui/LoadingDots";
import useApiTokenGeneration from "@/hooks/useApiTokenGeneration";
import { useService } from "@/context/ServiceContext";
import { Input, InputLabel } from "./ui";

interface DemoServiceRequestFormProps {
  serviceName: string;
  providerContractAddress: string;
}

export default function DemoServiceRequestForm({
  serviceName,
  providerContractAddress,
}: DemoServiceRequestFormProps) {
  const [requestInput, setRequestInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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

  // Reset image response when token is regenerated or reset
  useEffect(() => {
    if (isGenerating || !tokenHash) {
      setImageUrl(null);
    }
  }, [isGenerating, tokenHash]);

  // Demo image paths from public directory
  const demoImages = ["/image.png"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageUrl(null); // Clear previous response

    if (!requestInput.trim()) {
      console.log("[DemoServiceRequestForm] Empty request input");
      return;
    }

    if (!providerContractAddress || !maxEscrow) {
      console.error(
        "[DemoServiceRequestForm] Missing contract address or maxEscrow"
      );
      return;
    }

    // If we have a token, return a demo image
    if (tokenHash) {
      console.log(
        "[DemoServiceRequestForm] Token available, generating demo image..."
      );
      setIsLoadingApi(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 4000));

        // Select a random demo image
        const randomImage =
          demoImages[Math.floor(Math.random() * demoImages.length)];
        setImageUrl(randomImage);
      } catch (err) {
        console.error(
          "[DemoServiceRequestForm] Demo image generation failed:",
          err
        );
      } finally {
        setIsLoadingApi(false);
      }
      return;
    }

    // If no token, check if approval is needed first
    if (needsApproval) {
      console.log(
        "[DemoServiceRequestForm] Approval needed, calling approveSpending"
      );
      await approveSpending(
        providerContractAddress as `0x${string}`,
        maxEscrow
      );
      return;
    }

    // If no token and approval is NOT needed (or already done), generate token
    console.log(
      "[DemoServiceRequestForm] No token, initiating token generation..."
    );
    await generateToken(providerContractAddress as `0x${string}`, maxEscrow);
  };

  // Determine button text and status text
  let buttonText = "send request";
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
      buttonText = "generate token";
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
    statusText = "processing";
  }

  return (
    <div className="mt-8 w-full">
      <h3 className="">{serviceName}</h3>
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

      {imageUrl && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">response:</h3>
          <div className="w-full overflow-hidden max-w-96 max-h-96">
            <img
              src={imageUrl}
              alt="Generated from prompt"
              className="w-full object-cover"
              onError={() => setImageUrl("/images/demo/error.jpg")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
