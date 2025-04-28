import { useServiceLaunch } from "@/context/ServiceLaunchContext";

export default function DeploymentStatus() {
  const {
    deploymentStatus: status,
    errorMessage,
    txHash,
    contractAddresses,
  } = useServiceLaunch();

  if (status === "idle") return null;

  if (status === "error") {
    return (
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
    );
  }

  if (status === "success") {
    return (
      <div className="text-green-500 mt-4 p-3 border border-green-500 space-y-2">
        <p className="font-bold">Service successfully launched!</p>
        <p>
          Your service is now live on the blockchain and registered in our
          database.
        </p>

        {/* Display contract addresses */}
        <div className="mt-2 pt-2 border-t border-green-500 text-xs">
          <p className="text-white">Contract Addresses:</p>
          {contractAddresses.providerContract && (
            <p className="text-white font-mono break-all">
              Provider Contract: {contractAddresses.providerContract}
            </p>
          )}
          {contractAddresses.coinContract && (
            <p className="text-white font-mono break-all">
              Coin Contract: {contractAddresses.coinContract}
            </p>
          )}
        </div>

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
    );
  }

  return null;
}
