import { useEffect, useState, useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import {
  getTokenAllowance,
  approveTokens,
  deployBondingCurveContract,
  findBondingCurveForProviderToken,
  FACTORY_ADDRESS,
} from "@/services/bondingCurveServices";
import { formatEther, maxUint256 } from "viem";
import { useServiceLaunch } from "@/context/ServiceLaunchContext";

export type BondingCurveStatus =
  | "idle"
  | "fetching"
  | "needsApproval"
  | "approving"
  | "approved"
  | "deploying"
  | "success"
  | "error";

interface UseBondingCurveSetupReturn {
  providerToken: `0x${string}` | null;
  percentage: string;
  setPercentage: (pct: string) => void;

  // balances & allowance
  formattedBalance: string;
  formattedInitialAmount: string;
  allowanceEnough: boolean;
  allowanceDisplay: string;

  // status & tx
  status: BondingCurveStatus;
  isPending: boolean;
  isWaitingReceipt: boolean;

  // existing curve
  existingBondingCurve: `0x${string}` | null;
  bondingCurveAddress: `0x${string}` | undefined;
  checkingExistence: boolean;

  // actions
  handleApprove: () => void;
  handleDeploy: () => void;
}

export default function useBondingCurveSetup(): UseBondingCurveSetupReturn {
  const { deploymentStatus, contractAddresses } = useServiceLaunch();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const {
    writeContract,
    data: writeData,
    error,
    isPending,
  } = useWriteContract();

  // UI / state vars
  const [providerToken, setProviderToken] = useState<`0x${string}` | null>(
    null
  );
  const [percentage, setPercentage] = useState("50"); // default 50%

  // fixed parameters (18-dec scaled)
  const fixedSlope = BigInt("100000000000000"); // 0.0001 * 1e18
  const fixedIntercept = BigInt("10000000000000000"); // 0.01 * 1e18

  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0));

  // Track if bonding curve exists
  const [existingBondingCurve, setExistingBondingCurve] = useState<
    `0x${string}` | null
  >(null);
  const [checkingExistence, setCheckingExistence] = useState(false);

  const [currentAction, setCurrentAction] = useState<
    "idle" | "approve" | "deploy"
  >("idle");
  const [status, setStatus] = useState<BondingCurveStatus>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [bondingCurveAddress, setBondingCurveAddress] = useState<
    `0x${string}` | undefined
  >();

  /* ------------------------------------------------------------------ */
  /* Effects                                                            */
  /* ------------------------------------------------------------------ */

  // Check if bonding curve already exists
  useEffect(() => {
    const checkBondingCurve = async () => {
      if (
        !address ||
        !publicClient ||
        deploymentStatus !== "success" ||
        !contractAddresses.providerContract
      )
        return;

      setCheckingExistence(true);

      try {
        // First get token address for the provider contract
        const providerTokenAddress = (await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: [
            {
              inputs: [{ name: "provider", type: "address" }],
              name: "getProviderToken",
              outputs: [{ name: "", type: "address" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "getProviderToken",
          args: [address as `0x${string}`],
        })) as `0x${string}`;

        if (providerTokenAddress) {
          // Find bonding curve that matches this provider token
          const bondingCurve = await findBondingCurveForProviderToken(
            publicClient,
            address as `0x${string}`,
            providerTokenAddress
          );

          if (bondingCurve) {
            setExistingBondingCurve(bondingCurve);
            setBondingCurveAddress(bondingCurve);
            setProviderToken(providerTokenAddress);
            setStatus("success");
          } else {
            // bonding curve not yet deployed but we still store token for allowance/balance
            setProviderToken(providerTokenAddress);
          }
        } else {
          // still store providerTokenAddress if we got it
          if (providerTokenAddress) setProviderToken(providerTokenAddress);
        }
      } catch (err) {
        console.error(
          "[useBondingCurveSetup] Error checking bonding curve",
          err
        );
      } finally {
        setCheckingExistence(false);
      }
    };

    checkBondingCurve();
  }, [
    publicClient,
    deploymentStatus,
    contractAddresses.providerContract,
    txHash,
    address,
  ]);

  // Fetch token balance when token selected
  useEffect(() => {
    const fetchBalance = async () => {
      if (!providerToken || !address || !publicClient) return;
      try {
        const bal = (await publicClient.readContract({
          address: providerToken,
          abi: [
            {
              constant: true,
              inputs: [{ name: "account", type: "address" }],
              name: "balanceOf",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "balanceOf",
          args: [address],
        })) as bigint;
        setTokenBalance(bal);
      } catch (e) {
        console.error("[useBondingCurveSetup] Error fetching balance", e);
      }
    };
    fetchBalance();
  }, [providerToken, address, publicClient]);

  // Check allowance when selected token or deposit changes
  useEffect(() => {
    const checkAllowance = async () => {
      if (!providerToken || !address || !publicClient) return;
      const allowance = await getTokenAllowance(
        publicClient,
        providerToken,
        address,
        FACTORY_ADDRESS
      );
      setAllowance(allowance);
    };
    checkAllowance();
  }, [providerToken, address, publicClient, txHash]);

  // Wait for tx receipt
  const { data: receipt, isLoading: isWaitingReceipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Handle new writeData
  useEffect(() => {
    if (writeData) {
      setTxHash(writeData);
      if (currentAction === "approve") setStatus("approving");
      if (currentAction === "deploy") setStatus("deploying");
    }
  }, [writeData, currentAction]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("[useBondingCurveSetup] error", error);
      setStatus("error");
    }
  }, [error]);

  // Handle receipt
  useEffect(() => {
    if (!receipt) return;
    if (receipt.status === "success") {
      if (currentAction === "approve") {
        setStatus("approved");

        // Add delay to ensure blockchain state is updated
        setTimeout(() => {
          refreshAllowance();
        }, 2000);
      } else if (currentAction === "deploy") {
        setStatus("success");
        // Trigger a re-check after delay
        setTimeout(() => {
          setTxHash((prev) =>
            prev ? (`${prev}-recheck` as `0x${string}`) : undefined
          );
        }, 5000);
      }
    } else {
      setStatus("error");
    }
  }, [receipt, currentAction]);

  /* ------------------------------------------------------------------ */
  /* Helper Functions                                                   */
  /* ------------------------------------------------------------------ */
  const refreshAllowance = async () => {
    if (!providerToken || !address || !publicClient) return;
    try {
      const newAllowance = await getTokenAllowance(
        publicClient,
        providerToken,
        address,
        FACTORY_ADDRESS
      );
      setAllowance(newAllowance);
    } catch (err) {
      console.error("[useBondingCurveSetup] Error refreshing allowance", err);
    }
  };

  // Approve handler
  const handleApprove = useCallback(() => {
    if (!providerToken) return;
    // Calculate the exact amount needed for the transaction
    const pct = Number(percentage || "0");
    const amountToApprove = (tokenBalance * BigInt(pct)) / BigInt(100);
    // Add a small buffer (5% more) to avoid edge cases
    const bufferedAmount =
      amountToApprove + (amountToApprove * BigInt(5)) / BigInt(100);

    setCurrentAction("approve");
    approveTokens(
      writeContract,
      providerToken,
      FACTORY_ADDRESS,
      bufferedAmount
    );
  }, [providerToken, percentage, tokenBalance, writeContract]);

  // Deploy handler
  const handleDeploy = useCallback(() => {
    if (!providerToken) return;

    const pct = Number(percentage || "0");
    const initialTokenAmount = (tokenBalance * BigInt(pct)) / BigInt(100);

    setCurrentAction("deploy");
    deployBondingCurveContract(writeContract, {
      providerTokenAddress: providerToken,
      initialTokenAmount,
      slope: fixedSlope,
      intercept: fixedIntercept,
    });
  }, [providerToken, percentage, tokenBalance, writeContract]);

  /* ------------------------------------------------------------------ */
  /* Derived helpers for UI                                             */
  /* ------------------------------------------------------------------ */
  const initialTokenAmountDerived =
    (tokenBalance * BigInt(Number(percentage || "0"))) / BigInt(100);

  const allowanceEnough = allowance >= initialTokenAmountDerived;

  const formattedBalance = formatEther(tokenBalance).split(".")[0];
  const formattedInitialAmount = formatEther(initialTokenAmountDerived).split(
    "."
  )[0];

  const allowanceDisplay =
    allowance > maxUint256 - BigInt("10000000000000000000000000")
      ? "Unlimited"
      : formatEther(allowance).split(".")[0];

  return {
    providerToken,
    percentage,
    setPercentage,
    formattedBalance,
    formattedInitialAmount,
    allowanceEnough,
    allowanceDisplay,
    status,
    isPending,
    isWaitingReceipt,
    existingBondingCurve,
    bondingCurveAddress,
    checkingExistence,
    handleApprove,
    handleDeploy,
  };
}
