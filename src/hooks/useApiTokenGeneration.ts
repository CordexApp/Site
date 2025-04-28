import { useState, useEffect, useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  useBalance,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { generateApiToken } from "@/services/contractServices";
import { useService } from "@/context/ServiceContext";
import { providerContractAbi } from "@/services/contractServices";
import { erc20Abi } from "viem";

// Define the CRDX token address
const CRDX_TOKEN_ADDRESS =
  "0xa1F6848E87B968908cFa5478147B93de7C836E0f" as `0x${string}`;

interface TokenGenerationState {
  tokenHash: string | null;
  isCheckingAllowance: boolean;
  isApproving: boolean;
  needsApproval: boolean;
  isGenerating: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: string | null;
  approvalTransactionHash: `0x${string}` | undefined;
  generateTransactionHash: `0x${string}` | undefined;
}

export default function useApiTokenGeneration() {
  const { address: accountAddress } = useAccount();
  const { maxEscrow: contextMaxEscrow } = useService();

  const [tokenState, setTokenState] = useState<TokenGenerationState>({
    tokenHash: null,
    isCheckingAllowance: false,
    isApproving: false,
    needsApproval: false,
    isGenerating: false,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    approvalTransactionHash: undefined,
    generateTransactionHash: undefined,
  });

  // Hook for generateToken transaction
  const {
    writeContract: writeGenerateToken,
    isPending: isGenerateTokenPending,
    error: generateTokenError,
    data: generateTokenHash,
    reset: resetGenerateTokenWrite,
  } = useWriteContract();

  // Hook for approve transaction
  const {
    writeContract: writeApprove,
    isPending: isApprovePending,
    error: approveError,
    data: approveHash,
    reset: resetApproveWrite,
  } = useWriteContract();

  // Hook to wait for generateToken transaction receipt
  const {
    isLoading: isGenerateTokenConfirming,
    isSuccess: isGenerateTokenSuccess,
    data: generateTokenReceipt,
  } = useWaitForTransactionReceipt({
    hash: generateTokenHash,
  });

  // Hook to wait for approve transaction receipt
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Combined Pending State (Approve or Generate)
  useEffect(() => {
    const pending = isGenerateTokenPending || isApprovePending;
    if (pending !== tokenState.isPending) {
      console.log(
        "[useApiTokenGeneration] Transaction pending state changed:",
        pending
      );
      setTokenState((prev) => ({ ...prev, isPending: pending, error: null }));
    }
  }, [isGenerateTokenPending, isApprovePending, tokenState.isPending]);

  // Combined Confirmation State
  useEffect(() => {
    const confirming = isGenerateTokenConfirming || isApproveConfirming;
    if (confirming !== tokenState.isConfirming) {
      console.log(
        "[useApiTokenGeneration] Confirmation state changed:",
        confirming
      );
      setTokenState((prev) => ({ ...prev, isConfirming: confirming }));
    }
  }, [isGenerateTokenConfirming, isApproveConfirming, tokenState.isConfirming]);

  // Update generate transaction hash
  useEffect(() => {
    if (generateTokenHash) {
      console.log(
        "[useApiTokenGeneration] Generate Transaction hash received:",
        generateTokenHash
      );
      setTokenState((prev) => ({
        ...prev,
        generateTransactionHash: generateTokenHash,
      }));
    }
  }, [generateTokenHash]);

  // Update approval transaction hash
  useEffect(() => {
    if (approveHash) {
      console.log(
        "[useApiTokenGeneration] Approval Transaction hash received:",
        approveHash
      );
      setTokenState((prev) => ({
        ...prev,
        approvalTransactionHash: approveHash,
        isApproving: false,
      }));
    }
  }, [approveHash]);

  // Handle successful token generation
  useEffect(() => {
    if (isGenerateTokenSuccess && generateTokenReceipt) {
      console.log(
        "[useApiTokenGeneration] Generate transaction confirmed!",
        generateTokenReceipt
      );

      // TODO: Extract actual token hash from event logs if needed
      // For now, using a placeholder as before
      const simulatedTokenHash =
        "0x" +
        Array(64)
          .fill(0)
          .map((_, i) => i.toString(16))
          .join("");
      console.log(
        "[useApiTokenGeneration] Generated token hash:",
        simulatedTokenHash
      );

      setTokenState((prev) => ({
        ...prev,
        tokenHash: simulatedTokenHash,
        isGenerating: false,
        isSuccess: true,
        error: null,
      }));
    }
  }, [isGenerateTokenSuccess, generateTokenReceipt]);

  // Handle successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      console.log("[useApiTokenGeneration] Approval transaction confirmed!");
      setTokenState((prev) => ({
        ...prev,
        needsApproval: false,
        isApproving: false,
        error: null,
      }));
    }
  }, [isApproveSuccess]);

  // Combined Error Handling
  useEffect(() => {
    const error = generateTokenError || approveError;
    if (error) {
      console.error("[useApiTokenGeneration] Error:", error);
      setTokenState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Transaction failed",
        isGenerating: false,
        isApproving: false,
        isCheckingAllowance: false,
      }));
    }
  }, [generateTokenError, approveError]);

  // Function to check allowance and trigger approval if needed
  const checkAndApprove = useCallback(
    async (
      providerContractAddress: `0x${string}`,
      requiredAmountStr: string
    ): Promise<boolean> => {
      if (!accountAddress) {
        setTokenState((prev) => ({
          ...prev,
          error: "Please connect your wallet.",
        }));
        return false;
      }

      const requiredAmountBigInt = parseEther(requiredAmountStr);
      if (requiredAmountBigInt <= BigInt(0)) {
        console.log(
          "[useApiTokenGeneration] Required amount is 0, skipping approval."
        );
        return true;
      }

      setTokenState((prev) => ({
        ...prev,
        isCheckingAllowance: true,
        needsApproval: false,
        error: null,
      }));

      try {
        const allowance = (await (window as any).ethereum.request({
          method: "eth_call",
          params: [
            {
              to: CRDX_TOKEN_ADDRESS,
              data: `0xdd62ed3e${accountAddress
                .slice(2)
                .padStart(64, "0")}${providerContractAddress
                .slice(2)
                .padStart(64, "0")}`,
            },
            "latest",
          ],
        })) as string;

        const currentAllowance = BigInt(allowance);
        console.log(
          `[useApiTokenGeneration] Allowance check: Required=${requiredAmountBigInt}, Current=${currentAllowance}`
        );

        if (currentAllowance < requiredAmountBigInt) {
          console.log(
            "[useApiTokenGeneration] Insufficient allowance. Needs approval."
          );
          setTokenState((prev) => ({
            ...prev,
            needsApproval: true,
            isCheckingAllowance: false,
          }));
          return false;
        } else {
          console.log("[useApiTokenGeneration] Sufficient allowance found.");
          setTokenState((prev) => ({
            ...prev,
            needsApproval: false,
            isCheckingAllowance: false,
          }));
          return true;
        }
      } catch (err) {
        console.error("[useApiTokenGeneration] Error checking allowance:", err);
        setTokenState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : "Failed to check allowance",
          isCheckingAllowance: false,
        }));
        return false;
      }
    },
    [accountAddress]
  );

  // Function to initiate the approval transaction
  const approveSpending = useCallback(
    async (
      providerContractAddress: `0x${string}`,
      requiredAmountStr: string
    ) => {
      if (!accountAddress) {
        setTokenState((prev) => ({
          ...prev,
          error: "Please connect your wallet.",
        }));
        return;
      }
      if (!tokenState.needsApproval) {
        console.log(
          "[useApiTokenGeneration] Approval not needed or already sufficient."
        );
        return;
      }

      console.log("[useApiTokenGeneration] Initiating approval transaction...");
      setTokenState((prev) => ({
        ...prev,
        isApproving: true,
        error: null,
        approvalTransactionHash: undefined,
      }));

      try {
        resetApproveWrite();
        await writeApprove({
          address: CRDX_TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [providerContractAddress, parseEther(requiredAmountStr)],
        });
        console.log("[useApiTokenGeneration] Approval transaction submitted.");
      } catch (err) {
        console.error("[useApiTokenGeneration] writeApprove error:", err);
      }
    },
    [accountAddress, tokenState.needsApproval, writeApprove, resetApproveWrite]
  );

  // Function to initiate token generation (main user action)
  const generateToken = useCallback(
    async (
      providerContractAddress: string,
      maxEscrow: string = contextMaxEscrow || "0"
    ) => {
      setTokenState((prev) => ({
        ...prev,
        isGenerating: true,
        isSuccess: false,
        error: null,
        tokenHash: null,
        generateTransactionHash: undefined,
        approvalTransactionHash: undefined,
      }));
      resetGenerateTokenWrite();

      const providerAddress = providerContractAddress as `0x${string}`;

      // 1. Check allowance
      const allowanceSufficient = await checkAndApprove(
        providerAddress,
        maxEscrow
      );

      // 2. If allowance is NOT sufficient, stop (user needs to approve first)
      if (!allowanceSufficient) {
        setTokenState((prev) => ({ ...prev, isGenerating: false }));
        console.log(
          "[useApiTokenGeneration] Stopping generateToken, approval required."
        );
        return;
      }

      // 3. If allowance IS sufficient, proceed to generate the token
      console.log(
        "[useApiTokenGeneration] Allowance sufficient, proceeding to generate token."
      );
      try {
        await generateApiToken(writeGenerateToken, providerAddress, maxEscrow);
        console.log(
          "[useApiTokenGeneration] Generate token transaction submitted."
        );
      } catch (err) {
        console.error(
          "[useApiTokenGeneration] generateApiToken service error:",
          err
        );
        setTokenState((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [
      contextMaxEscrow,
      checkAndApprove,
      resetGenerateTokenWrite,
      writeGenerateToken,
    ]
  );

  // Function to reset the token state
  const resetToken = useCallback(() => {
    console.log("[useApiTokenGeneration] Resetting state.");
    setTokenState({
      tokenHash: null,
      isCheckingAllowance: false,
      isApproving: false,
      needsApproval: false,
      isGenerating: false,
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      approvalTransactionHash: undefined,
      generateTransactionHash: undefined,
    });
    resetApproveWrite();
    resetGenerateTokenWrite();
  }, [resetApproveWrite, resetGenerateTokenWrite]);

  return {
    ...tokenState,
    generateToken,
    approveSpending,
    resetToken,
  };
}
