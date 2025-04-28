"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { generateApiToken, makeApiRequest } from "@/services/contractServices";
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenHash, setTokenHash] = useState<string | null>(null);

  console.log("[ServiceRequestForm] Initialized with:", {
    serviceName,
    endpoint,
    providerContractAddress,
  });

  // Contract interaction hooks
  const {
    writeContract,
    isPending: isWritePending,
    data: hash,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Log state changes
  useEffect(() => {
    if (isWritePending) {
      console.log("[ServiceRequestForm] Transaction pending...");
    }
  }, [isWritePending]);

  useEffect(() => {
    if (isConfirming) {
      console.log(
        "[ServiceRequestForm] Waiting for transaction confirmation..."
      );
    }
  }, [isConfirming]);

  useEffect(() => {
    if (hash) {
      console.log("[ServiceRequestForm] Transaction hash received:", hash);
    }
  }, [hash]);

  useEffect(() => {
    if (isConfirmed) {
      console.log("[ServiceRequestForm] Transaction confirmed!");
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (receipt) {
      console.log("[ServiceRequestForm] Transaction receipt:", receipt);
    }
  }, [receipt]);

  // Handle token generation
  const handleGenerateToken = async () => {
    console.log("[ServiceRequestForm] Starting token generation process");
    try {
      setIsLoading(true);
      setError(null);

      // Fixed escrow amount of 0.0001 ETH for now
      const maxEscrow = "0.0001";
      console.log("[ServiceRequestForm] Using escrow amount:", maxEscrow);
      console.log(
        "[ServiceRequestForm] Provider contract address:",
        providerContractAddress
      );

      // Call contract to generate token
      console.log("[ServiceRequestForm] Calling generateApiToken...");
      await generateApiToken(
        writeContract,
        providerContractAddress as `0x${string}`,
        maxEscrow
      );
      console.log("[ServiceRequestForm] generateApiToken call completed");

      // Token hash will be available after transaction is confirmed
      console.log(
        "[ServiceRequestForm] Waiting for transaction confirmation to get token hash"
      );
    } catch (err) {
      console.error("[ServiceRequestForm] Error generating token:", err);
      setError("Failed to generate access token");
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(
      "[ServiceRequestForm] Form submitted with input:",
      requestInput
    );

    if (!requestInput.trim()) {
      console.log("[ServiceRequestForm] Empty request input, showing error");
      setError("Please enter a request");
      return;
    }

    if (!tokenHash) {
      console.log(
        "[ServiceRequestForm] No token hash yet, initiating token generation"
      );
      handleGenerateToken();
      return;
    }

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
      setIsLoading(false);
    } catch (err) {
      console.error("[ServiceRequestForm] API request failed:", err);
      setError("API request failed. Please try again.");
      setIsLoading(false);
    }
  };

  // When transaction is confirmed, extract token hash from events
  if (isConfirmed && receipt && !tokenHash) {
    console.log(
      "[ServiceRequestForm] Transaction confirmed, simulating token hash extraction"
    );
    // In a real implementation, you would parse the token hash from the receipt
    // For now, we'll simulate this with a placeholder
    const simulatedTokenHash = "0x" + Array(64).fill("0").join("");
    console.log(
      "[ServiceRequestForm] Generated simulated token hash:",
      simulatedTokenHash
    );
    setTokenHash(simulatedTokenHash);
    setIsLoading(false);
    console.log(
      "[ServiceRequestForm] Token hash set and ready for API request"
    );
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
            disabled={isLoading || isWritePending || isConfirming}
          >
            {!tokenHash ? "Generate Token & Send Request" : "Send Request"}
          </PrimaryButton>

          {(isLoading || isWritePending || isConfirming) && (
            <span className="ml-3 text-gray-400">
              {isWritePending || isConfirming
                ? "Confirming transaction..."
                : "Processing..."}
            </span>
          )}
        </div>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
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
