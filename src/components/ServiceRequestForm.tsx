"use client";

import { useState } from "react";
import { makeApiRequest } from "@/services/contractServices";
import { PrimaryButton } from "./ui/PrimaryButton";
import useApiTokenGeneration from "@/hooks/useApiTokenGeneration";

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
  const [isLoading, setIsLoading] = useState(false);

  // Use the API token generation hook to handle blockchain interactions
  const {
    tokenHash,
    isGenerating,
    isPending,
    isConfirming,
    isSuccess,
    error,
    transactionHash,
    generateToken,
    resetToken,
  } = useApiTokenGeneration();

  console.log("[ServiceRequestForm] Initialized with:", {
    serviceName,
    endpoint,
    providerContractAddress,
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(
      "[ServiceRequestForm] Form submitted with input:",
      requestInput
    );

    if (!requestInput.trim()) {
      console.log("[ServiceRequestForm] Empty request input, showing error");
      return;
    }

    // If we don't have a token yet, initiate token generation
    if (!tokenHash) {
      console.log(
        "[ServiceRequestForm] No token hash yet, initiating token generation"
      );
      await generateToken(providerContractAddress);
      return;
    }

    // If we have a token, make the API request
    try {
      console.log(
        "[ServiceRequestForm] Token hash available, making API request"
      );
      setIsLoading(true);

      // Make the API request with the token
      console.log(
        "[ServiceRequestForm] Sending request to endpoint:",
        endpoint
      );
      console.log("[ServiceRequestForm] Using token hash:", tokenHash);
      console.log("[ServiceRequestForm] Request payload:", {
        query: requestInput,
      });

      const result = await makeApiRequest(endpoint, tokenHash, {
        query: requestInput,
      });

      console.log("[ServiceRequestForm] API response received:", result);
      setResponse(result);
    } catch (err) {
      console.error("[ServiceRequestForm] API request failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 w-full">
      <h2 className="text-xl font-semibold mb-4">Send API Request</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="request"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Request Payload
          </label>
          <textarea
            id="request"
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            rows={4}
            value={requestInput}
            onChange={(e) => setRequestInput(e.target.value)}
            placeholder="Enter your request payload here..."
          />
        </div>

        <div>
          <PrimaryButton
            type="submit"
            disabled={isLoading || isGenerating || isPending || isConfirming}
          >
            {!tokenHash ? "Generate Token & Send Request" : "Send Request"}
          </PrimaryButton>

          {(isLoading || isGenerating || isPending || isConfirming) && (
            <span className="ml-3 text-gray-400">
              {isPending || isConfirming
                ? "Confirming transaction..."
                : isGenerating
                ? "Generating token..."
                : "Processing..."}
            </span>
          )}
        </div>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

        {/* Transaction hash link */}
        {transactionHash && (
          <div className="mt-3 text-sm">
            <a
              href={`https://sepolia-optimism.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative text-white font-medium group inline-block"
            >
              view transaction on etherscan
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
            </a>
          </div>
        )}
      </form>

      {response && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Response:</h3>
          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
