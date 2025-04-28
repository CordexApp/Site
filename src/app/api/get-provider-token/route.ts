import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { optimismSepolia } from "viem/chains";

// Create public client for blockchain interaction
const publicClient = createPublicClient({
  chain: optimismSepolia,
  transport: http(),
});

// ContractFactory ABI (only the function we need)
const contractFactoryAbi = [
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderContract",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ContractFactory address
const contractFactoryAddress = "0xe68f605a83ca55e78e51ce3f46aea37c0454461c";

// Provider contract ABI (only the function we need)
const providerContractAbi = [
  {
    inputs: [],
    name: "providerAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function GET(request: NextRequest) {
  try {
    // Get contract address from query params
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get("contractAddress");

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Missing contractAddress parameter" },
        { status: 400 }
      );
    }

    // First, we need to get the provider address from the contract
    const providerAddress = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: providerContractAbi,
      functionName: "providerAddress",
    });

    if (!providerAddress) {
      return NextResponse.json(
        { error: "Failed to get provider address" },
        { status: 404 }
      );
    }

    console.log("Provider address:", providerAddress);

    // Get the provider token address using the factory
    const tokenAddress = await publicClient.readContract({
      address: contractFactoryAddress as `0x${string}`,
      abi: contractFactoryAbi,
      functionName: "getProviderToken",
      args: [providerAddress],
    });

    console.log("Token address:", tokenAddress);

    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "No token address found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tokenAddress });
  } catch (error) {
    console.error("Error in get-provider-token API:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider token" },
      { status: 500 }
    );
  }
} 