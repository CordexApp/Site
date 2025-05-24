import { useServiceLaunch } from "@/context/ServiceLaunchContext";
import ImageUploader from "./ImageUploader";
import { Input, LoadingDots, NumericInput, PrimaryButton } from "./ui";

export default function ServiceForm() {
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
        required
      />

      <Input
        label="api endpoint"
        type="text"
        value={apiEndpoint}
        onChange={(e) => setApiEndpoint(e.target.value)}
        placeholder="https://api.myservice.com"
        required
      />

      <ImageUploader
        onImageSelected={handleImageSelect}
        imagePreview={imagePreview}
        label="service image"
      />

      <NumericInput
        label="max escrow (crdx)"
        value={maxEscrow}
        onChange={(e) => setMaxEscrow(e.target.value)}
        allowDecimal={true}
        step="0.001"
        placeholder="0.1"
        required
      />

      <Input
        label="token name"
        type="text"
        value={tokenName}
        onChange={(e) => setTokenName(e.target.value)}
        placeholder="my service token"
        required
      />

      <Input
        label="token symbol"
        type="text"
        value={tokenSymbol}
        onChange={(e) => setTokenSymbol(e.target.value)}
        placeholder="mst"
        required
      />

      <PrimaryButton
        type="submit"
        disabled={
          isSubmitting || isPending || isWaitingForReceipt || isUploading
        }
        className="relative group"
      >
        {isPending ? (
          <LoadingDots text="submitting" />
        ) : isSubmitting ? (
          <LoadingDots text="confirming" />
        ) : isWaitingForReceipt ? (
          <LoadingDots text="verifying" />
        ) : isUploading ? (
          <LoadingDots text="uploading image" />
        ) : (
          "launch service"
        )}
      </PrimaryButton>
    </form>
  );
}
