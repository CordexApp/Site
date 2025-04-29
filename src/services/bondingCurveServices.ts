import { parseEther, maxUint256, formatEther } from "viem";
import { useWriteContract, usePublicClient } from "wagmi";

// Factory contract address (same as contractServices)
export const FACTORY_ADDRESS =
  "0xca38c4d7889d7337ceea5c53db82f70f12a7b9e7" as `0x${string}`;

// Minimal ABI for ContractFactory deployBondingCurveContract & getProviderTokens
export const factoryAbi = [
  {
    inputs: [
      { name: "providerTokenAddress", type: "address" },
      { name: "initialTokenAmount", type: "uint256" },
      { name: "slope", type: "uint256" },
      { name: "intercept", type: "uint256" },
    ],
    name: "deployBondingCurveContract",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderTokens",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getBondingCurveContract",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getBondingCurveContracts",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Minimal ERC20 ABI for allowance & approve & balanceOf & symbol & name
export const erc20Abi = [
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Minimal ABI for bonding curve's providerTokenAddress function
export const bondingCurveAbi = [
  {
    inputs: [],
    name: "providerTokenAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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

export const approveTokens = (
  writeContract: ReturnType<typeof useWriteContract>["writeContract"],
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint
) => {
  return writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });
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
