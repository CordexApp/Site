// Contract services for Cordex service deployment
import { parseEther, formatEther } from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";

// Import ABIs
import { ContractFactoryAbi } from "@/abis/ContractFactory";
import { ProviderContractAbi } from "@/abis/ProviderContract";

// ContractFactory configuration
export const contractConfig = {
  address: "0xaa0c84e338e8e1b1086b2f002a33306d2a2182b1" as `0x${string}`,
  abi: ContractFactoryAbi,
};

// Provider contract ABI
export const providerContractAbi = ProviderContractAbi;

// Used to extract contract addresses from transaction receipt
export const extractContractAddressFromReceipt = (
  receipt: any
): {
  providerContract?: `0x${string}`;
  coinContract?: `0x${string}`;
} => {
  console.log(
    "[contractServices] Attempting to extract contract addresses from receipt:",
    receipt
  );

  let result = {
    providerContract: undefined as `0x${string}` | undefined,
    coinContract: undefined as `0x${string}` | undefined,
  };

  if (receipt.logs && receipt.logs.length > 0) {
    console.log(
      "[contractServices] Analyzing transaction logs. Found",
      receipt.logs.length,
      "logs"
    );

    // Look for the ProviderContractDeployed event
    for (const [index, log] of receipt.logs.entries()) {
      // Check if log is from our factory contract
      if (
        log.address &&
        log.address.toLowerCase() === contractConfig.address.toLowerCase()
      ) {
        console.log(
          `[contractServices] Log #${index} is from factory contract:`,
          log.address
        );

        // If we have topics and the log is from our factory
        if (log.topics && log.topics.length > 0) {
          console.log(`[contractServices] Log #${index} topics:`, log.topics);

          // The event data contains all our needed information
          if (log.data) {
            try {
              // In Ethereum logs, data is packed in 32-byte chunks
              console.log(`[contractServices] Log #${index} data:`, log.data);
              const rawData = log.data.slice(2); // remove 0x prefix
              console.log(`[contractServices] Raw data (hex):`, rawData);

              // In the ProviderContractDeployed event:
              // First 32 bytes: Provider contract address (padded to 32 bytes)
              // Second 32 bytes: Coin contract address (padded to 32 bytes)
              // The rest: API endpoint offset, maxEscrow, etc.

              // Extract provider contract address (first parameter)
              const providerContractHex = rawData.slice(24, 64);
              result.providerContract =
                `0x${providerContractHex}` as `0x${string}`;
              console.log(
                `[contractServices] Extracted provider contract address: 0x${providerContractHex}`
              );

              // Extract coin contract address (second parameter)
              const coinContractHex = rawData.slice(64 + 24, 64 + 64);
              result.coinContract = `0x${coinContractHex}` as `0x${string}`;
              console.log(
                `[contractServices] Extracted coin contract address: 0x${coinContractHex}`
              );

              // Log the full data breakdown
              console.log("[contractServices] Event data breakdown:");
              for (let i = 0; i < rawData.length; i += 64) {
                if (i + 64 <= rawData.length) {
                  const chunk = rawData.slice(i, i + 64);
                  const address = `0x${chunk.slice(24)}`;
                  console.log(
                    `[contractServices] Chunk ${
                      i / 64
                    }: ${chunk} (potential address: ${address})`
                  );
                }
              }
            } catch (decodeError) {
              console.error(
                "[contractServices] Error decoding event data:",
                decodeError
              );
            }
          }
        }
      }
    }
  }

  console.log("[contractServices] Extracted contract addresses:", result);
  return result;
};

// Deploy a new provider contract
export const deployProviderContract = (
  writeContract: ReturnType<typeof useWriteContract>["writeContract"],
  params: {
    apiEndpoint: string;
    maxEscrow: string;
    tokenName: string;
    tokenSymbol: string;
  }
) => {
  console.log(
    "[contractServices] Deploying provider contract with params:",
    params
  );

  // Note: The contract factory automatically uses the connected wallet as the owner
  return writeContract({
    ...contractConfig,
    functionName: "deployProviderContract",
    args: [
      params.apiEndpoint,
      parseEther(params.maxEscrow),
      params.tokenName,
      params.tokenSymbol,
    ],
  });
};

// Get contract address for a provider using contract call
export const getProviderContractAddress = async (
  publicClient: ReturnType<typeof usePublicClient>,
  providerAddress: string
): Promise<`0x${string}` | null> => {
  console.log(
    "[contractServices] Getting provider contract address for:",
    providerAddress
  );

  if (!publicClient) {
    console.log("[contractServices] Public client not available");
    return null;
  }

  try {
    // Call the getProviderContract function
    console.log("[contractServices] Calling getProviderContract function");
    const data = await publicClient.readContract({
      address: contractConfig.address,
      abi: contractConfig.abi,
      functionName: "getProviderContract",
      args: [providerAddress as `0x${string}`],
    });

    console.log("[contractServices] getProviderContract result:", data);

    if (data && data !== "0x0000000000000000000000000000000000000000") {
      return data as `0x${string}`;
    }
    console.log(
      "[contractServices] No contract address found or zero address returned"
    );
    return null;
  } catch (error) {
    console.error(
      "[contractServices] Error calling getProviderContract:",
      error
    );
    return null;
  }
};

// Generate a token for API access
export const generateApiToken = (
  writeContract: ReturnType<typeof useWriteContract>["writeContract"],
  providerContractAddress: `0x${string}`,
  maxEscrow: string
) => {
  // Generate a random nonce
  const userNonce = Math.floor(Math.random() * 1000000);

  console.log("[contractServices] Generating API token with:", {
    providerContractAddress,
    maxEscrow,
    userNonce,
  });

  return writeContract({
    address: providerContractAddress,
    abi: providerContractAbi,
    functionName: "generateToken",
    args: [parseEther(maxEscrow), BigInt(userNonce)],
  });
};

// Check if a provider contract is active
export const checkContractActive = async (
  publicClient: ReturnType<typeof usePublicClient>,
  providerContractAddress: `0x${string}`
): Promise<boolean> => {
  console.log(
    "[contractServices] Checking if contract is active:",
    providerContractAddress
  );

  if (!publicClient) {
    console.log("[contractServices] Public client not available");
    return false;
  }

  try {
    // Call the isActive function
    const isActive = await publicClient.readContract({
      address: providerContractAddress,
      abi: providerContractAbi,
      functionName: "isActive",
    });

    console.log("[contractServices] Contract active status:", isActive);
    return Boolean(isActive);
  } catch (error) {
    console.error("[contractServices] Error checking contract status:", error);
    return false;
  }
};

// Get the provider address of a contract
export const getContractProvider = async (
  publicClient: ReturnType<typeof usePublicClient>,
  providerContractAddress: `0x${string}`
): Promise<`0x${string}` | null> => {
  console.log(
    "[contractServices] Getting provider address for contract:",
    providerContractAddress
  );

  if (!publicClient) {
    console.log("[contractServices] Public client not available");
    return null;
  }

  try {
    // Call the provider function
    const provider = await publicClient.readContract({
      address: providerContractAddress,
      abi: providerContractAbi,
      functionName: "provider",
    });

    console.log("[contractServices] Contract provider address:", provider);
    return provider as `0x${string}`;
  } catch (error) {
    console.error("[contractServices] Error getting contract provider:", error);
    return null;
  }
};

// Get the maxEscrow value from a provider contract
export const getContractMaxEscrow = async (
  publicClient: ReturnType<typeof usePublicClient>,
  providerContractAddress: `0x${string}`
): Promise<string | null> => {
  console.log(
    "[contractServices] Getting maxEscrow for contract:",
    providerContractAddress
  );

  if (!publicClient) {
    console.log("[contractServices] Public client not available");
    return null;
  }

  try {
    // Call the maxEscrow function
    const maxEscrowBigInt = await publicClient.readContract({
      address: providerContractAddress,
      abi: providerContractAbi,
      functionName: "maxEscrow",
    });

    // Convert from Wei to Ether as a formatted string
    const maxEscrowInEther = (Number(maxEscrowBigInt) / 1e18).toString();

    console.log(
      "[contractServices] Contract maxEscrow value:",
      maxEscrowInEther
    );
    return maxEscrowInEther;
  } catch (error) {
    console.error("[contractServices] Error getting maxEscrow:", error);
    return null;
  }
};

// Set the active status of a provider contract
export const setContractActive = (
  writeContract: ReturnType<typeof useWriteContract>["writeContract"],
  providerContractAddress: `0x${string}`,
  isActive: boolean
) => {
  console.log("[contractServices] Setting contract active status:", {
    providerContractAddress,
    isActive,
  });

  return writeContract({
    address: providerContractAddress,
    abi: providerContractAbi,
    functionName: "setContractStatus",
    args: [isActive],
  });
};

// Make an API request with the token
export const makeApiRequest = async (
  endpoint: string,
  tokenHash: string,
  requestData: any
): Promise<any> => {
  console.log("[contractServices] Making API request to endpoint:", endpoint);
  console.log("[contractServices] Using token hash:", tokenHash);
  console.log("[contractServices] Request data:", requestData);

  try {
    console.log("[contractServices] Sending fetch request");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenHash}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[contractServices] API request failed:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("[contractServices] API response received:", responseData);
    return responseData;
  } catch (error) {
    console.error("[contractServices] Error making API request:", error);
    throw error;
  }
};
