import { useServiceLaunch } from "@/context/ServiceLaunchContext";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "./ui/PrimaryButton";

export default function DeploymentStatus() {
  const router = useRouter();
  const {
    deploymentStatus: status,
    errorMessage,
    txHash,
    contractAddresses,
  } = useServiceLaunch();

  const handleManageService = () => {
    if (contractAddresses.providerContract) {
      router.push(`/manage-service/${contractAddresses.providerContract}`);
    }
  };

  if (status === "idle") return null;

  if (status === "error") {
    return (
      <div className="text-red-500 mt-4">
        <h4>deployment failed</h4>
        <p className="lowercase">{errorMessage}</p>
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
    );
  }

  if (status === "success") {
    return (
      <div className="">
        <p>
          your service is now live on the blockchain and registered in our
          database.
        </p>

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

        {/* Manage Service Button */}
        <div className="mt-4 pt-4">
          <PrimaryButton onClick={handleManageService}>
            Manage Your Service
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return null;
}
