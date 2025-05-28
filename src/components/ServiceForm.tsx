import { useServiceLaunch } from "@/context/ServiceLaunchContext";
import { useAccount } from "wagmi";
import ImageUploader from "./ImageUploader";
import { Input, LoadingDots, NumericInput, PrimaryButton } from "./ui";

export default function ServiceForm() {
  const { isConnected } = useAccount();
  const {
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
    imagePreview,
    handleImageSelect,
    handleSubmit,
    isPending,
    isWaitingForReceipt,
    isUploading,
    deploymentStatus,
  } = useServiceLaunch();

  const isSubmitting = deploymentStatus === "pending";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <Input
        label="service name"
        type="text"
        value={serviceName}
        onChange={(e) => setServiceName(e.target.value)}
        placeholder="my awesome service"
        disabled={!isConnected}
        required
      />

      <Input
        label="api endpoint"
        type="text"
        value={apiEndpoint}
        onChange={(e) => setApiEndpoint(e.target.value)}
        placeholder="https://api.myservice.com"
        disabled={!isConnected}
        required
      />

      <ImageUploader
        onImageSelected={handleImageSelect}
        imagePreview={imagePreview}
        label="service image"
        disabled={!isConnected}
      />

      <NumericInput
        label="max escrow (crdx)"
        value={maxEscrow}
        onChange={(e) => setMaxEscrow(e.target.value)}
        allowDecimal={true}
        step="0.001"
        placeholder="0.1"
        disabled={!isConnected}
        required
      />

      <Input
        label="token name"
        type="text"
        value={tokenName}
        onChange={(e) => setTokenName(e.target.value)}
        placeholder="my service token"
        disabled={!isConnected}
        required
      />

      <Input
        label="token symbol"
        type="text"
        value={tokenSymbol}
        onChange={(e) => setTokenSymbol(e.target.value)}
        placeholder="mst"
        disabled={!isConnected}
        required
      />

      <PrimaryButton
        type="submit"
        disabled={!isConnected || isSubmitting || isPending || isWaitingForReceipt}
        className="w-full"
      >
        {!isConnected ? (
          "connect wallet to launch"
        ) : isSubmitting || isPending || isWaitingForReceipt || isUploading ? (
          <LoadingDots text="launching service" />
        ) : (
          "launch service"
        )}
      </PrimaryButton>
    </form>
  );
}
