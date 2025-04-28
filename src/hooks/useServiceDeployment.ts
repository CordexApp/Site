import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { createService } from "@/services/servicesService";
import {
  contractConfig,
  deployProviderContract,
  extractContractAddressFromReceipt,
  getProviderContractAddress,
} from "@/services/contractServices";

export default function useServiceDeployment() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [contractAddresses, setContractAddresses] = useState<{
    providerContract?: `0x${string}`;
    coinContract?: `0x${string}`;
  }>({});
  const publicClient = usePublicClient();

  // Write contract hook
  const {
    writeContract,
    isPending,
    error,
    data: writeData,
  } = useWriteContract();

  // Update txHash when writeData is available
  useEffect(() => {
    if (writeData) {
      console.log("Contract write successful, txHash:", writeData);
      setTxHash(writeData);
      setDeploymentStatus("pending");
    }
  }, [writeData]);

  // Handle errors from writeContract
  useEffect(() => {
    if (error) {
      console.error("Contract write error:", error);
      setDeploymentStatus("error");
      setErrorMessage(error.message || "Transaction failed");
    }
  }, [error]);

  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Log transaction receipt when it arrives
  useEffect(() => {
    if (receipt) {
      console.log("Full transaction receipt:", receipt);
    }
  }, [receipt]);

  // Register service in database
  const registerService = async (
    serviceName: string,
    apiEndpoint: string,
    imageUrl: string | null,
    providerContractAddress: string,
    coinContractAddress?: string
  ) => {
    try {
      console.log("Starting service registration with contracts:", {
        provider: providerContractAddress,
        coin: coinContractAddress,
      });

      // Create service in database
      console.log("Creating service in database with data:", {
        name: serviceName,
        endpoint: apiEndpoint,
        image: imageUrl || undefined,
        provider_contract_address: providerContractAddress,
        coin_contract_address: coinContractAddress,
      });

      const newService = await createService({
        name: serviceName,
        endpoint: apiEndpoint,
        image: imageUrl || undefined,
        provider_contract_address: providerContractAddress,
        coin_contract_address: coinContractAddress,
      });

      if (!newService) {
        console.error("Failed to register service in database");
        throw new Error("Service creation failed");
      } else {
        console.log("Service registered successfully:", newService);
      }
    } catch (error) {
      console.error("Error registering service:", error);
      throw error;
    }
  };

  // Deploy a new service
  const deployService = (params: {
    serviceName: string;
    apiEndpoint: string;
    maxEscrow: string;
    tokenName: string;
    tokenSymbol: string;
    imageUrl: string | null;
  }) => {
    setDeploymentStatus("idle");
    setErrorMessage("");
    setTxHash(undefined);
    setContractAddresses({});

    console.log("Initiating contract deployment with parameters:", {
      apiEndpoint: params.apiEndpoint,
      maxEscrow: params.maxEscrow,
      tokenName: params.tokenName,
      tokenSymbol: params.tokenSymbol,
    });

    deployProviderContract(writeContract, {
      apiEndpoint: params.apiEndpoint,
      maxEscrow: params.maxEscrow,
      tokenName: params.tokenName,
      tokenSymbol: params.tokenSymbol,
    });
  };

  // Process transaction receipt when available
  useEffect(() => {
    if (receipt && deploymentStatus === "pending") {
      console.log("Transaction receipt received:", receipt);

      const processReceipt = async () => {
        try {
          // Check if transaction was successful
          if (receipt.status === "success") {
            console.log("Transaction confirmed successful");

            // Extract contract addresses from the ProviderContractDeployed event
            const extractedAddresses =
              extractContractAddressFromReceipt(receipt);
            console.log("Extracted contract addresses:", extractedAddresses);

            setContractAddresses(extractedAddresses);

            // If we couldn't extract the provider contract address, try using the contract call
            if (
              !extractedAddresses.providerContract &&
              window.ethereum?.selectedAddress
            ) {
              console.log(
                "Unable to extract provider contract address from logs. Attempting to get it using contract call..."
              );

              const userAddress = window.ethereum.selectedAddress;
              console.log("Using user address for lookup:", userAddress);

              const lookupContractAddress = await getProviderContractAddress(
                publicClient,
                userAddress
              );

              if (lookupContractAddress) {
                console.log(
                  "Provider contract address from contract call:",
                  lookupContractAddress
                );

                // Update the state with the retrieved address
                setContractAddresses((prev) => ({
                  ...prev,
                  providerContract: lookupContractAddress,
                }));
              }
            }

            if (
              extractedAddresses.providerContract ||
              extractedAddresses.coinContract
            ) {
              // Additional logic would go here to register the service
              console.log("Contract deployed successfully:");
              console.log(
                "- Provider Contract:",
                extractedAddresses.providerContract
              );
              console.log("- Coin Contract:", extractedAddresses.coinContract);
              setDeploymentStatus("success");
            } else {
              console.error(
                "Failed to extract contract addresses from transaction receipt"
              );
              setErrorMessage(
                "Failed to extract contract addresses from transaction receipt"
              );
              setDeploymentStatus("error");
            }
          } else {
            console.error("Transaction reverted on blockchain");
            setDeploymentStatus("error");
            setErrorMessage("Transaction reverted on the blockchain");
          }
        } catch (error) {
          console.error("Error processing transaction receipt:", error);
          setDeploymentStatus("error");
          setErrorMessage(
            "Error processing transaction: " +
              (error instanceof Error ? error.message : String(error))
          );
        }
      };

      processReceipt();
    }
  }, [receipt, deploymentStatus, publicClient]);

  return {
    deployService,
    registerService,
    deploymentStatus,
    isPending,
    isWaitingForReceipt,
    txHash,
    errorMessage,
    contractAddresses,
    setDeploymentStatus,
  };
}
