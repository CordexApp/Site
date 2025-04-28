"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  FormEvent,
} from "react";
import useImageUpload from "@/hooks/useImageUpload";
import useServiceDeployment from "@/hooks/useServiceDeployment";

interface ServiceLaunchContextType {
  // Form state
  serviceName: string;
  setServiceName: (value: string) => void;
  apiEndpoint: string;
  setApiEndpoint: (value: string) => void;
  maxEscrow: string;
  setMaxEscrow: (value: string) => void;
  tokenName: string;
  setTokenName: (value: string) => void;
  tokenSymbol: string;
  setTokenSymbol: (value: string) => void;

  // Image handling
  imageFile: File | null;
  imagePreview: string | null;
  isUploading: boolean;
  uploadedImageUrl: string | null;
  handleImageSelect: (file: File | null) => void;

  // Deployment state
  deploymentStatus: "idle" | "pending" | "success" | "error";
  isPending: boolean;
  isWaitingForReceipt: boolean;
  txHash?: `0x${string}`;
  errorMessage: string;
  contractAddresses: {
    providerContract?: `0x${string}`;
    coinContract?: `0x${string}`;
  };
  activationStatus: "idle" | "pending" | "success" | "error";

  // Actions
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  activateContract: (contractAddress: `0x${string}`) => void;
}

const ServiceLaunchContext = createContext<
  ServiceLaunchContextType | undefined
>(undefined);

export function ServiceLaunchProvider({ children }: { children: ReactNode }) {
  // Form state
  const [serviceName, setServiceName] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [maxEscrow, setMaxEscrow] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");

  // Custom hooks
  const {
    imageFile,
    imagePreview,
    isUploading,
    uploadedImageUrl,
    handleImageSelect,
    uploadImageToS3,
  } = useImageUpload();

  const {
    deployService,
    deploymentStatus,
    isPending,
    isWaitingForReceipt,
    txHash,
    errorMessage,
    contractAddresses,
    activateContract,
    activationStatus,
  } = useServiceDeployment();

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log("Form submitted with values:", {
        serviceName,
        apiEndpoint,
        maxEscrow,
        tokenName,
        tokenSymbol,
        hasImage: !!imageFile,
      });

      if (
        !apiEndpoint ||
        !maxEscrow ||
        !tokenName ||
        !tokenSymbol ||
        !serviceName
      ) {
        console.warn("Form validation failed - missing required fields");
        return;
      }

      // Pre-upload image if available
      let imageUrl = uploadedImageUrl;
      if (imageFile && !uploadedImageUrl) {
        console.log("Pre-uploading image before contract deployment");
        imageUrl = await uploadImageToS3();
        if (!imageUrl) {
          console.warn("Pre-upload failed");
        }
      }

      // Deploy service contract
      deployService({
        serviceName,
        apiEndpoint,
        maxEscrow,
        tokenName,
        tokenSymbol,
        imageUrl,
      });
    },
    [
      serviceName,
      apiEndpoint,
      maxEscrow,
      tokenName,
      tokenSymbol,
      imageFile,
      uploadedImageUrl,
      uploadImageToS3,
      deployService,
    ]
  );

  const value = {
    // Form state
    serviceName,
    setServiceName,
    apiEndpoint,
    setApiEndpoint,
    maxEscrow,
    setMaxEscrow,
    tokenName,
    setTokenName,
    tokenSymbol,
    setTokenSymbol,

    // Image handling
    imageFile,
    imagePreview,
    isUploading,
    uploadedImageUrl,
    handleImageSelect,

    // Deployment state
    deploymentStatus,
    isPending,
    isWaitingForReceipt,
    txHash,
    errorMessage,
    contractAddresses,
    activationStatus,

    // Actions
    handleSubmit,
    activateContract,
  };

  return (
    <ServiceLaunchContext.Provider value={value}>
      {children}
    </ServiceLaunchContext.Provider>
  );
}

export function useServiceLaunch() {
  const context = useContext(ServiceLaunchContext);
  if (context === undefined) {
    throw new Error(
      "useServiceLaunch must be used within a ServiceLaunchProvider"
    );
  }
  return context;
}
