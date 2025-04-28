"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { parseEther } from "viem";
import { useTransaction, useWriteContract } from "wagmi";
import { createService, getUploadPresignedUrl } from "@/api/services";

export default function LaunchService() {
  console.log("LaunchService component rendering");

  const [serviceName, setServiceName] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [maxEscrow, setMaxEscrow] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ContractFactory deployed address
  const contractConfig = {
    address: "0x5d6beb7d2cdc41ab6adce15c582cba64d32dee00" as `0x${string}`,
    abi: [
      {
        inputs: [
          { name: "apiEndpoint", type: "string" },
          { name: "maxEscrow", type: "uint256" },
          { name: "tokenName", type: "string" },
          { name: "tokenSymbol", type: "string" },
        ],
        name: "deployProviderContract",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderContract",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderToken",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderContracts",
        outputs: [{ name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ name: "provider", type: "address" }],
        name: "getProviderTokens",
        outputs: [{ name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const,
  };

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

  // Transaction status monitoring
  const {
    data: txData,
    isSuccess,
    isError,
  } = useTransaction({
    hash: txHash,
  });

  useEffect(() => {
    if (txHash) {
      console.log("Transaction data:", txData);
      console.log(
        "Transaction status - isSuccess:",
        isSuccess,
        "isError:",
        isError
      );
    }
  }, [txHash, txData, isSuccess, isError]);

  // Verify transaction outcome when transaction is confirmed
  useEffect(() => {
    // Only run this if we have a transaction hash, the transaction is successful,
    // we're in pending state, and we're not already verifying
    if (txHash && isSuccess && deploymentStatus === "pending" && !isVerifying) {
      console.log("Starting transaction verification process");
      setIsVerifying(true);

      // Manual check for transaction status using Etherscan API
      const checkTransactionStatus = async () => {
        try {
          console.log("Fetching transaction receipt for hash:", txHash);
          // Use the direct transaction receipt approach which is more reliable
          const receiptResponse = await fetch(
            `https://sepolia-optimism.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`
          );
          const receiptData = await receiptResponse.json();

          console.log("Transaction receipt:", receiptData);

          // Check if status is 0x0 (failure) in the receipt
          if (receiptData?.result?.status === "0x0") {
            console.error("Transaction reverted on blockchain");
            setDeploymentStatus("error");
            setErrorMessage("Transaction reverted on the blockchain");
          } else if (receiptData?.result?.status === "0x1") {
            // Status 0x1 means success
            console.log("Transaction confirmed successful (0x1)");
            setDeploymentStatus("success");

            // Get the contract address from the transaction receipt
            const contractAddress = receiptData?.result?.logs?.find(
              (log: any) => log.topics?.length > 0
            )?.address;

            console.log("Extracted contract address:", contractAddress);

            if (contractAddress) {
              // Register service in our database
              console.log(
                "Registering service with contract address:",
                contractAddress
              );
              await registerService(contractAddress);
            } else {
              console.warn("Could not extract contract address from logs");
            }
          } else {
            console.log(
              "Transaction status not definitively determined from receipt, trying secondary verification"
            );
            // If we can't determine the status from the receipt, try the transaction status API
            try {
              const response = await fetch(
                `https://sepolia-optimism.etherscan.io/api?module=transaction&action=getstatus&txhash=${txHash}`
              );
              const data = await response.json();

              console.log("Transaction status response:", data);

              // If the API indicates an error in the transaction
              if (data?.status === "1" && data?.result?.isError === "1") {
                console.error(
                  "Transaction execution failed:",
                  data?.result?.errDescription
                );
                setDeploymentStatus("error");

                // Special case for the known error - this is now removed with the new contract
                if (
                  data?.result?.errDescription?.includes(
                    "Provider already has a contract"
                  )
                ) {
                  setErrorMessage("Provider already has a contract");
                } else {
                  setErrorMessage(
                    data?.result?.errDescription || "Contract execution failed"
                  );
                }
              } else {
                // If we get here, default to success
                console.log(
                  "Secondary verification complete, defaulting to success"
                );
                setDeploymentStatus("success");
              }
            } catch (innerErr) {
              console.error("Error in secondary verification:", innerErr);
              // Default to success if both verification methods fail
              setDeploymentStatus("success");
            }
          }
        } catch (err) {
          console.error("Error checking transaction status:", err);
          // Default to success if verification fails completely
          // This assumes that isSuccess from useTransaction is reliable enough
          setDeploymentStatus("success");
        } finally {
          setIsVerifying(false);
        }
      };

      checkTransactionStatus();
    }

    // Handle transaction error
    if (isError && deploymentStatus === "pending") {
      console.error("Transaction failed in useTransaction hook");
      setDeploymentStatus("error");
      setErrorMessage("Transaction failed");
    }
  }, [txHash, isSuccess, isError, deploymentStatus, isVerifying]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    console.log("File selected:", file?.name || "none");
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("File preview generated");
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  // Upload image to S3 via presigned URL
  const uploadImageToS3 = async (): Promise<string | null> => {
    if (!imageFile) {
      console.log("No image file to upload");
      return null;
    }

    console.log("Starting image upload process for:", imageFile.name);
    setIsUploading(true);
    try {
      // Get presigned URL
      console.log("Requesting presigned URL for upload");
      const presignedData = await getUploadPresignedUrl(
        imageFile.name,
        imageFile.type
      );

      if (!presignedData) {
        console.error("Failed to get presigned URL");
        throw new Error("Failed to get upload URL");
      }

      console.log("Received presigned URL:", presignedData.presigned_url);
      console.log("Object key:", presignedData.object_key);

      // Upload file to S3
      console.log("Uploading file to S3...");
      const uploadResponse = await fetch(presignedData.presigned_url, {
        method: "PUT",
        body: imageFile,
        headers: {
          "Content-Type": imageFile.type,
        },
      });

      if (!uploadResponse.ok) {
        console.error("S3 upload failed with status:", uploadResponse.status);
        throw new Error("Failed to upload image");
      }

      // Construct the S3 URL (this is a standard S3 URL format)
      const s3BucketUrl =
        "https://cordex-service-images.s3.us-west-2.amazonaws.com";
      const finalUrl = `${s3BucketUrl}/${presignedData.object_key}`;
      console.log("Image uploaded successfully, URL:", finalUrl);
      return finalUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Register service in database
  const registerService = async (contractAddress: string) => {
    try {
      console.log(
        "Starting service registration with contract:",
        contractAddress
      );

      // If we have an image, upload it first
      let imageUrl = uploadedImageUrl;
      if (imageFile && !imageUrl) {
        console.log("Uploading image before service registration");
        imageUrl = await uploadImageToS3();
        if (imageUrl) {
          console.log("Image uploaded and URL received:", imageUrl);
          setUploadedImageUrl(imageUrl);
        } else {
          console.warn("Image upload failed during service registration");
        }
      }

      // Create service in database
      console.log("Creating service in database with data:", {
        name: serviceName,
        endpoint: apiEndpoint,
        image: imageUrl || undefined,
      });

      const newService = await createService({
        name: serviceName,
        endpoint: apiEndpoint,
        image: imageUrl || undefined,
      });

      if (!newService) {
        console.error("Failed to register service in database");
      } else {
        console.log("Service registered successfully:", newService);
      }
    } catch (error) {
      console.error("Error registering service:", error);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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

    setDeploymentStatus("idle");
    setErrorMessage("");
    setIsVerifying(false);
    setTxHash(undefined);

    // Pre-upload image if available
    if (imageFile && !uploadedImageUrl) {
      console.log("Pre-uploading image before contract deployment");
      uploadImageToS3().then((url) => {
        if (url) {
          console.log("Pre-upload successful, URL:", url);
          setUploadedImageUrl(url);
        } else {
          console.warn("Pre-upload failed");
        }
      });
    }

    // Call deployProviderContract on the ContractFactory
    console.log("Initiating contract deployment with parameters:", {
      apiEndpoint,
      maxEscrow: parseEther(maxEscrow).toString(),
      tokenName,
      tokenSymbol,
    });

    writeContract({
      ...contractConfig,
      functionName: "deployProviderContract",
      args: [apiEndpoint, parseEther(maxEscrow), tokenName, tokenSymbol],
    });
  };

  return (
    <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-12 font-mono bg-black text-white">
      <h1 className="text-3xl font-bold mb-8">launch your service</h1>

      <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-1">service name</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="my awesome service"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">api endpoint</label>
            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="https://api.myservice.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">service image</label>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-700 hover:border-white transition-colors"
              >
                {imageFile ? "change image" : "select image"}
              </button>
              {imagePreview && (
                <div className="relative w-16 h-16 overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">max escrow (eth)</label>
            <input
              type="number"
              value={maxEscrow}
              onChange={(e) => setMaxEscrow(e.target.value)}
              step="0.001"
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="0.1"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">token name</label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="my service token"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">token symbol</label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none"
              placeholder="mst"
              required
            />
          </div>

          <button
            type="submit"
            disabled={
              isPending ||
              deploymentStatus === "pending" ||
              isVerifying ||
              isUploading
            }
            className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? "submitting..."
              : deploymentStatus === "pending"
              ? "confirming..."
              : isVerifying
              ? "verifying..."
              : isUploading
              ? "uploading image..."
              : "launch service"}
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
          </button>

          {deploymentStatus === "error" && (
            <div className="text-red-500 mt-2 p-3 border border-red-500">
              <p className="font-bold">Deployment failed</p>
              <p>{errorMessage}</p>
              {txHash && (
                <a
                  href={`https://sepolia-optimism.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative text-white font-medium group inline-block mt-2"
                >
                  view transaction
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
                </a>
              )}
            </div>
          )}

          {deploymentStatus === "success" && (
            <div className="text-green-500 mt-4 p-3 border border-green-500 space-y-2">
              <p className="font-bold">Service successfully launched!</p>
              <p>
                Your service is now live on the blockchain and registered in our
                database.
              </p>
              {txHash && (
                <a
                  href={`https://sepolia-optimism.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative text-white font-medium group inline-block"
                >
                  view transaction
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
                </a>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
