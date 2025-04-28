import { useServiceLaunch } from "@/context/ServiceLaunchContext";
import ImageUploader from "./ImageUploader";

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

      <ImageUploader
        onImageSelected={handleImageSelect}
        imagePreview={imagePreview}
      />

      <div>
        <label className="block text-sm mb-1">max escrow (crdx)</label>
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
          isSubmitting || isPending || isWaitingForReceipt || isUploading
        }
        className="relative text-white font-medium group px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending
          ? "submitting..."
          : isSubmitting
          ? "confirming..."
          : isWaitingForReceipt
          ? "verifying..."
          : isUploading
          ? "uploading image..."
          : "launch service"}
        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
      </button>
    </form>
  );
}
