import {
  parseEther,
  maxUint256,
  formatEther,
  TransactionReceipt,
  PublicClient,
  Hash,
} from "viem";
import { useWriteContract, usePublicClient } from "wagmi";

// Import ABIs
import { ContractFactoryAbi } from "@/abis/ContractFactory";
import { ERC20Abi } from "@/abis/ERC20";
import { BondingCurveAbi } from "@/abis/BondingCurveContract";

// Factory contract address
const factoryAddressEnv = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
if (!factoryAddressEnv) {
  throw new Error(
    "NEXT_PUBLIC_FACTORY_ADDRESS environment variable is not set."
  );
}
export const FACTORY_ADDRESS = factoryAddressEnv as `0x${string}`;

// Minimal ABI for ContractFactory (Use imported ABI)
export const factoryAbi = ContractFactoryAbi;

// Minimal ERC20 ABI (Use imported ABI)
export const erc20Abi = ERC20Abi;

// Minimal ABI for bonding curve (Use imported ABI)
export const bondingCurveAbi = BondingCurveAbi;

// -------- Helper functions --------

export const deployBondingCurveContract = (
  writeContract: ReturnType<typeof useWriteContract>["writeContract"],
  params: {
    providerTokenAddress: `0x${string}`;
    initialTokenAmount: bigint; // already 18-decimals scaled
    slope: bigint; // 18-decimals scaled
    intercept: bigint; // 18-decimals scaled
  }
) => {
  return writeContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "deployBondingCurveContract",
    args: [
      params.providerTokenAddress,
      params.initialTokenAmount,
      params.slope,
      params.intercept,
    ],
  });
};

export const getProviderTokensForWallet = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  walletAddress: string
): Promise<`0x${string}`[]> => {
  try {
    if (!publicClient) return [];
    const tokens = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: "getProviderTokens",
      args: [walletAddress as `0x${string}`],
    });
    return tokens as `0x${string}`[];
  } catch (err) {
    console.error("[bondingCurveServices] getProviderTokens error:", err);
    return [];
  }
};

export const getTokenAllowance = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
): Promise<bigint> => {
  try {
    if (!publicClient) return BigInt(0);
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender],
    });
    return allowance as bigint;
  } catch (err) {
    console.error("[bondingCurveServices] getTokenAllowance error:", err);
    return BigInt(0);
  }
};

export const approveTokens = async (
  publicClient: PublicClient | undefined,
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"],
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint
): Promise<TransactionReceipt | null> => {
  if (!publicClient) {
    console.error(
      "[bondingCurveServices] Public client not available for approveTokens."
    );
    return null;
  }
  const txHash = await writeContractAsync({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });

  console.log("[bondingCurveServices] Approve transaction hash:", txHash);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log("[bondingCurveServices] Approve transaction confirmed:", receipt);
  return receipt;
};

export const getBondingCurveContract = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  providerContractAddress: `0x${string}`
): Promise<`0x${string}` | null> => {
  try {
    if (!publicClient) return null;
    const bondingCurveAddress = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: "getBondingCurveContract",
      args: [providerContractAddress],
    });

    // Check if address is zero address (means no bonding curve)
    if (bondingCurveAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    return bondingCurveAddress as `0x${string}`;
  } catch (err) {
    console.error(
      "[bondingCurveServices] getBondingCurveContract error for provider contract",
      providerContractAddress,
      ":",
      err
    );
    return null;
  }
};

export const formatAmount = (amount: bigint): string => {
  // Format to 2 decimal places
  const amountStr = formatEther(amount);
  const parts = amountStr.split(".");
  if (parts.length === 2) {
    return `${parts[0]}.${parts[1].substring(0, 2)}`;
  }
  return amountStr;
};

export const findBondingCurveForProviderToken = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  walletAddress: `0x${string}`,
  providerTokenAddress: `0x${string}`
): Promise<`0x${string}` | null> => {
  try {
    if (!publicClient) return null;

    console.log(
      `[BONDING CURVE LOOKUP] Starting search for wallet ${walletAddress} and token ${providerTokenAddress}`
    );

    // Get all bonding curves for this wallet
    const curves = (await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: "getBondingCurveContracts",
      args: [walletAddress],
    })) as `0x${string}`[];

    console.log(
      `[BONDING CURVE LOOKUP] Found ${
        curves?.length || 0
      } bonding curves for wallet:`,
      curves
    );

    if (!curves || curves.length === 0) {
      console.log(
        "[BONDING CURVE LOOKUP] No bonding curves found for this wallet"
      );
      return null;
    }

    // For each curve, check if it matches our provider token
    console.log(
      `[BONDING CURVE LOOKUP] Looking for curve with token: ${providerTokenAddress}`
    );
    for (const curveAddress of curves) {
      try {
        console.log(`[BONDING CURVE LOOKUP] Checking curve: ${curveAddress}`);
        const tokenAddress = (await publicClient.readContract({
          address: curveAddress,
          abi: bondingCurveAbi,
          functionName: "providerTokenAddress",
        })) as `0x${string}`;

        console.log(
          `[BONDING CURVE LOOKUP] Curve ${curveAddress} has token: ${tokenAddress}`
        );
        console.log(
          `[BONDING CURVE LOOKUP] Comparing with needed token: ${providerTokenAddress}`
        );

        // Compare addresses case-insensitively
        if (tokenAddress.toLowerCase() === providerTokenAddress.toLowerCase()) {
          console.log(
            `[BONDING CURVE LOOKUP] MATCH FOUND! Curve ${curveAddress} matches token ${providerTokenAddress}`
          );
          return curveAddress;
        } else {
          console.log(
            `[BONDING CURVE LOOKUP] No match for this curve. ${tokenAddress.toLowerCase()} !== ${providerTokenAddress.toLowerCase()}`
          );
        }
      } catch (err) {
        console.error(
          `[BONDING CURVE LOOKUP] Error checking token for curve ${curveAddress}:`,
          err
        );
      }
    }

    console.log(
      `[BONDING CURVE LOOKUP] No matching bonding curve found for token ${providerTokenAddress}`
    );
    return null;
  } catch (err) {
    console.error(
      "[BONDING CURVE LOOKUP] Error in findBondingCurveForProviderToken:",
      err
    );
    return null;
  }
};

// -------- Bonding Curve Trading Functions --------

export const getCurrentPrice = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  bondingCurveAddress: `0x${string}`
): Promise<string> => {
  try {
    if (!publicClient) return "0";
    const price = await publicClient.readContract({
      address: bondingCurveAddress,
      abi: bondingCurveAbi,
      functionName: "getCurrentPrice",
    });
    return formatEther(price as bigint);
  } catch (err) {
    console.error("[bondingCurveServices] getCurrentPrice error:", err);
    return "0";
  }
};

export const calculatePrice = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  bondingCurveAddress: `0x${string}`,
  amount: bigint
): Promise<bigint> => {
  try {
    if (!publicClient) return BigInt(0);
    const price = await publicClient.readContract({
      address: bondingCurveAddress,
      abi: bondingCurveAbi,
      functionName: "calculatePrice",
      args: [amount],
    });
    return price as bigint;
  } catch (err) {
    console.error("[bondingCurveServices] calculatePrice error:", err);
    return BigInt(0);
  }
};

export const getTokenSupply = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  bondingCurveAddress: `0x${string}`
): Promise<bigint> => {
  try {
    if (!publicClient) return BigInt(0);
    const supply = await publicClient.readContract({
      address: bondingCurveAddress,
      abi: bondingCurveAbi,
      functionName: "tokenSupply",
    });
    console.log("[bondingCurveServices] Unformatted token supply:", supply);
    return supply as bigint;
  } catch (err) {
    console.error("[bondingCurveServices] getTokenSupply error:", err);
    return BigInt(0);
  }
};

export const getCordexTokenAddress = async (
  publicClient: ReturnType<typeof usePublicClient> | undefined,
  bondingCurveAddress: `0x${string}`
): Promise<`0x${string}` | null> => {
  try {
    if (!publicClient) return null;
    const address = await publicClient.readContract({
      address: bondingCurveAddress,
      abi: bondingCurveAbi,
      functionName: "cordexTokenAddress",
    });
    return address as `0x${string}`;
  } catch (err) {
    console.error("[bondingCurveServices] getCordexTokenAddress error:", err);
    return null;
  }
};

export const buyTokens = async (
  publicClient: PublicClient | undefined,
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"],
  bondingCurveAddress: `0x${string}`,
  tokenAmount: bigint
): Promise<TransactionReceipt | null> => {
  if (!publicClient) {
    console.error(
      "[bondingCurveServices] Public client not available for buyTokens."
    );
    return null;
  }
  const txHash = await writeContractAsync({
    address: bondingCurveAddress,
    abi: bondingCurveAbi,
    functionName: "buyTokens",
    args: [tokenAmount],
  });

  console.log("[bondingCurveServices] Buy transaction hash:", txHash);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log("[bondingCurveServices] Buy transaction confirmed:", receipt);
  return receipt;
};

export const sellTokens = async (
  publicClient: PublicClient | undefined,
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"],
  bondingCurveAddress: `0x${string}`,
  tokenAmount: bigint
): Promise<TransactionReceipt | null> => {
  if (!publicClient) {
    console.error(
      "[bondingCurveServices] Public client not available for sellTokens."
    );
    return null;
  }
  const txHash = await writeContractAsync({
    address: bondingCurveAddress,
    abi: bondingCurveAbi,
    functionName: "sellTokens",
    args: [tokenAmount],
  });

  console.log("[bondingCurveServices] Sell transaction hash:", txHash);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log("[bondingCurveServices] Sell transaction confirmed:", receipt);
  return receipt;
};
