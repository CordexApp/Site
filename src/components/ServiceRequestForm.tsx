"use client";

import { useService } from "@/context/ServiceContext";
import useApiTokenGeneration from "@/hooks/useApiTokenGeneration";
import { makeApiRequest } from "@/services/contractServices";
import { useEffect, useState } from "react";
import { Input, InputLabel } from "./ui";
import { LoadingDots } from "./ui/LoadingDots";
import { PrimaryButton } from "./ui/PrimaryButton";

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
  const [isUserActionInProgress, setIsUserActionInProgress] = useState(false);

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
    isApproveSuccess,
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
    setResponse(null);

    if (!requestInput.trim() || !providerContractAddress || !maxEscrow) return;

    if (isCheckingAllowance) { 
      console.warn("[ServiceRequestForm] handleSubmit: Initial allowance check in progress. Please try again in a moment.");
      return; 
    }

    // Prevent re-submission if a previous action initiated by this form is already visibly processing
    if (isUserActionInProgress && (isApproving || isGenerating || isPending || isConfirming || isLoadingApi)) {
      console.log("[ServiceRequestForm] handleSubmit: Action already in progress by this form.");
      return; 
    }

    // If a token already exists, handle it directly and bypass the main effect for sequence.
    if (tokenHash) {
      console.log("[ServiceRequestForm] handleSubmit: Token exists. Making API request directly.");
      setIsUserActionInProgress(true); // Still signal an action is starting
      setIsLoadingApi(true);
      try {
        const result = await makeApiRequest(endpoint, tokenHash, { query: requestInput });
        setResponse(result);
      } catch (err) {
        setResponse({ error: "API request failed." });
      } finally {
        setIsLoadingApi(false);
        setIsUserActionInProgress(false); // Reset for this direct path completion
      }
      return; // Explicitly return after handling existing token
    }

    // If no token, set the flag. The useEffect will drive the approve/generate/send flow.
    console.log("[ServiceRequestForm] handleSubmit: No token. Setting isUserActionInProgress to true.");
    setIsUserActionInProgress(true); 
  };
  
  // Main useEffect to drive the sequential flow of operations
  useEffect(() => {
    if (!isUserActionInProgress) {
      // Not user-initiated, or previous action completed/reset.
      return;
    }

    // Re-entrancy guard: if any operation is visibly in flight by the hook, wait.
    if (isApproving || isGenerating || isPending || isConfirming) {
      console.log("[Form useEffect Flow] Bypassing: an operation is already in progress by the hook (wallet/transaction).");
      return;
    }
    // Also guard if this effect's own API call is already loading.
    if (isLoadingApi) {
      console.log("[Form useEffect Flow] Bypassing: API call is already loading.");
      return;
    }

    const executeNextStepInFlow = async () => {
      if (tokenHash) { 
        // This means token generation was the last step, now make the API call.
        console.log("[Form useEffect Flow] State: Token is now available. Making API request.");
        setIsLoadingApi(true);
        try {
          // Ensure requestInput and endpoint are valid here if they can change
          if (!requestInput.trim() || !endpoint) {
            console.error("[Form useEffect Flow] Missing input or endpoint for API call.");
            setResponse({ error: "Internal error: Missing input for API call." });
            setIsUserActionInProgress(false); // Stop flow
            return;
          }
          const result = await makeApiRequest(endpoint, tokenHash, { query: requestInput });
          setResponse(result);
        } catch (err) { 
          setResponse({ error: "API request failed." });
        } finally {
          setIsLoadingApi(false);
          setIsUserActionInProgress(false); // Entire flow complete
        }
        return; // Flow ends here
      }

      // If no token yet, decide next step based on approval status:
      if (needsApproval) { 
        console.log("[Form useEffect Flow] State: Needs approval. Initiating approval.");
        if (!maxEscrow) {
          console.error("[Form useEffect Flow] maxEscrow is null, cannot approve spending.");
          setResponse({ error: "Internal error: Missing maxEscrow for approval." });
          setIsUserActionInProgress(false); // Stop flow
          return;
        }
        await approveSpending(providerContractAddress as `0x${string}`, maxEscrow);
        // After this, hook state (isApproving, isPending, then isApproveSuccess, needsApproval) will change, re-triggering effect.
      } else { // Approval not needed (or already done and needsApproval is now false)
        console.log("[Form useEffect Flow] State: Approval not needed / done. Initiating token generation.");
        if (!maxEscrow) {
          console.error("[Form useEffect Flow] maxEscrow is null, cannot generate token.");
          setResponse({ error: "Internal error: Missing maxEscrow for token generation." });
          setIsUserActionInProgress(false); // Stop flow
          return;
        }
        await generateToken(providerContractAddress as `0x${string}`, maxEscrow);
        // After this, hook state (isGenerating, isPending, then isTokenGenerationSuccess, tokenHash) will change, re-triggering effect.
      }
    };

    executeNextStepInFlow();

  }, [
    // Core state drivers for the flow progression
    isUserActionInProgress,
    tokenHash, 
    needsApproval, 
    // Hook processing flags for re-entrancy guard
    isCheckingAllowance, // Though handleSubmit checks this, good to have if effect behavior changes
    isApproving, 
    isGenerating, 
    isPending, 
    isConfirming,
    isLoadingApi, // Form's own processing flag for the API call step
    // Dependencies for actions within executeNextStepInFlow
    providerContractAddress, 
    maxEscrow, 
    endpoint, 
    requestInput,
    // Actions from hook and services
    approveSpending, 
    generateToken, 
    makeApiRequest,
    // Setters used in this effect
    setResponse, 
    setIsLoadingApi, 
    setIsUserActionInProgress
  ]);

  // useEffect to reset isUserActionInProgress on error from hook
  useEffect(() => {
    if (error && isUserActionInProgress) {
      console.log("[ServiceRequestForm useEffect] Error detected from hook, resetting user action flag.", error);
      setIsUserActionInProgress(false);
    }
  }, [error, isUserActionInProgress]);

  // Determine button text and status text
  let statusText = "";
  const isProcessing =
    isCheckingAllowance ||
    isApproving ||
    isGenerating ||
    isPending ||
    isConfirming ||
    isLoadingApi;

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
              "send"
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
