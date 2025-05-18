import {
  deployProviderContract,
  extractContractAddressFromReceipt,
  getProviderContractAddress,
  setContractActive
} from "@/services/contractServices";
import { createService } from "@/services/servicesService";
import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

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
  const [currentAction, setCurrentAction] = useState<
    "deploy" | "activate" | null
  >(null);
  const [activationStatus, setActivationStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const publicClient = usePublicClient();
  const { address: connectedWalletAddress } = useAccount();

  // Store service details for registration
  const [serviceDetails, setServiceDetails] = useState<{
    name: string;
    endpoint: string;
    imageUrl: string | null;
  } | null>(null);

  // Flag to track if registration has been done
  const [isRegistered, setIsRegistered] = useState(false);

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
      console.log(
        `Contract ${currentAction} write successful, txHash:`,
        writeData
      );
      setTxHash(writeData);

      if (currentAction === "deploy") {
        setDeploymentStatus("pending");
      } else if (currentAction === "activate") {
        setActivationStatus("pending");
      }
    }
  }, [writeData, currentAction]);

  // Handle errors from writeContract
  useEffect(() => {
    if (error) {
      console.error(`Contract ${currentAction} write error:`, error);

      if (currentAction === "deploy") {
        setDeploymentStatus("error");
        setErrorMessage(error.message || "Deployment failed");
      } else if (currentAction === "activate") {
        setActivationStatus("error");
        setErrorMessage(error.message || "Activation failed");
      }
    }
  }, [error, currentAction]);

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

  // Internal function to register service
  const registerServiceInDb = async (
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
        owner: connectedWalletAddress,
      });

      // Create service in database
      console.log("Creating service in database with data:", {
        name: serviceName,
        endpoint: apiEndpoint,
        image: imageUrl || undefined,
        provider_contract_address: providerContractAddress,
        coin_contract_address: coinContractAddress,
        owner_wallet_address: connectedWalletAddress,
      });

      const newService = await createService({
        name: serviceName,
        endpoint: apiEndpoint,
        image: imageUrl || undefined,
        provider_contract_address: providerContractAddress,
        coin_contract_address: coinContractAddress,
        owner_wallet_address: connectedWalletAddress,
      });

      if (!newService) {
        console.error("Failed to register service in database");
        throw new Error("Service creation failed");
      } else {
        console.log("Service registered successfully:", newService);
        setIsRegistered(true);
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
    setCurrentAction("deploy");
    setDeploymentStatus("idle");
    setErrorMessage("");
    setTxHash(undefined);
    setContractAddresses({});
    setIsRegistered(false);

    // Store service details for later registration
    setServiceDetails({
      name: params.serviceName,
      endpoint: params.apiEndpoint,
      imageUrl: params.imageUrl,
    });

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
    if (!receipt) return;

    if (currentAction === "deploy" && deploymentStatus === "pending") {
      console.log("Processing deployment receipt:", receipt);

      const processDeploymentReceipt = async () => {
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

      processDeploymentReceipt();
    } else if (currentAction === "activate" && activationStatus === "pending") {
      console.log("Processing activation receipt:", receipt);

      // For activation, we only need to check if the transaction was successful
      if (receipt.status === "success") {
        console.log("Contract activation successful");
        setActivationStatus("success");
      } else {
        console.error("Contract activation failed");
        setActivationStatus("error");
        setErrorMessage("Contract activation transaction failed");
      }
    }
  }, [
    receipt,
    deploymentStatus,
    activationStatus,
    currentAction,
    publicClient,
  ]);

  // Auto-register the service when deployment succeeds and we have contract addresses
  useEffect(() => {
    const autoRegisterService = async () => {
      if (
        deploymentStatus === "success" &&
        serviceDetails &&
        contractAddresses.providerContract &&
        !isRegistered
      ) {
        try {
          console.log("Auto-registering service after successful deployment");

          await registerServiceInDb(
            serviceDetails.name,
            serviceDetails.endpoint,
            serviceDetails.imageUrl,
            contractAddresses.providerContract,
            contractAddresses.coinContract
          );

          console.log("Service auto-registration complete");
        } catch (error) {
          console.error("Error during service auto-registration:", error);
        }
      }
    };

    autoRegisterService();
  }, [deploymentStatus, contractAddresses, serviceDetails, isRegistered]);

  return {
    deployService,
    deploymentStatus,
    isPending,
    isWaitingForReceipt,
    txHash,
    errorMessage,
    contractAddresses,
    setDeploymentStatus,
    activationStatus,
    activateContract: (contractAddress: `0x${string}`) => {
      if (!contractAddress) {
        console.error("Cannot activate: No provider contract address provided");
        return;
      }

      // Set the current action to "activate" so the receipt handler knows what to do
      setCurrentAction("activate");
      setActivationStatus("pending");
      setErrorMessage("");
      setTxHash(undefined);

      console.log("Activating provider contract:", contractAddress);
      return setContractActive(writeContract, contractAddress, true);
    },
  };
}
