import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { generateApiToken } from "@/services/contractServices";

interface TokenGenerationState {
  tokenHash: string | null;
  isGenerating: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: string | null;
  transactionHash: `0x${string}` | undefined;
}

export default function useApiTokenGeneration() {
  // Token generation state
  const [tokenState, setTokenState] = useState<TokenGenerationState>({
    tokenHash: null,
    isGenerating: false,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    transactionHash: undefined,
  });

  // Contract interaction hooks
  const {
    writeContract,
    isPending,
    error: writeError,
    data: hash,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Update state when transaction is pending
  useEffect(() => {
    if (isPending) {
      console.log("[useApiTokenGeneration] Transaction pending...");
      setTokenState((prev) => ({
        ...prev,
        isPending: true,
        error: null,
      }));
    } else {
      setTokenState((prev) => ({
        ...prev,
        isPending: false,
      }));
    }
  }, [isPending]);

  // Update state when transaction hash is received
  useEffect(() => {
    if (hash) {
      console.log("[useApiTokenGeneration] Transaction hash received:", hash);
      setTokenState((prev) => ({
        ...prev,
        transactionHash: hash,
      }));
    }
  }, [hash]);

  // Update state when waiting for confirmation
  useEffect(() => {
    if (isConfirming) {
      console.log(
        "[useApiTokenGeneration] Waiting for transaction confirmation..."
      );
      setTokenState((prev) => ({
        ...prev,
        isConfirming: true,
      }));
    } else {
      setTokenState((prev) => ({
        ...prev,
        isConfirming: false,
      }));
    }
  }, [isConfirming]);

  // Update state when transaction is confirmed
  useEffect(() => {
    if (isSuccess && receipt) {
      console.log("[useApiTokenGeneration] Transaction confirmed!", receipt);
      setTokenState((prev) => ({
        ...prev,
        isSuccess: true,
      }));

      // Generate simulated token hash
      // In a real implementation, you would extract the token hash from the receipt's events
      const simulatedTokenHash = "0x" + Array(64).fill("0").join("");
      console.log(
        "[useApiTokenGeneration] Generated token hash:",
        simulatedTokenHash
      );

      setTokenState((prev) => ({
        ...prev,
        tokenHash: simulatedTokenHash,
        isGenerating: false,
      }));
    }
  }, [isSuccess, receipt]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      console.error("[useApiTokenGeneration] Error:", writeError);
      setTokenState((prev) => ({
        ...prev,
        error:
          writeError instanceof Error
            ? writeError.message
            : "Transaction failed",
        isGenerating: false,
      }));
    }
  }, [writeError]);

  // Function to initiate token generation
  const generateToken = async (
    providerContractAddress: string,
    maxEscrow: string = "0.0001" // Default escrow amount
  ) => {
    try {
      console.log("[useApiTokenGeneration] Starting token generation process");
      console.log(
        "[useApiTokenGeneration] Provider contract:",
        providerContractAddress
      );
      console.log("[useApiTokenGeneration] Escrow amount:", maxEscrow);

      setTokenState((prev) => ({
        ...prev,
        isGenerating: true,
        error: null,
        tokenHash: null,
        isSuccess: false,
      }));

      await generateApiToken(
        writeContract,
        providerContractAddress as `0x${string}`,
        maxEscrow
      );

      console.log("[useApiTokenGeneration] Token generation initiated");
    } catch (err) {
      console.error("[useApiTokenGeneration] Error generating token:", err);
      setTokenState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to generate token",
        isGenerating: false,
      }));
    }
  };

  // Function to reset the token state
  const resetToken = () => {
    setTokenState({
      tokenHash: null,
      isGenerating: false,
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      transactionHash: undefined,
    });
  };

  return {
    ...tokenState,
    generateToken,
    resetToken,
  };
}
