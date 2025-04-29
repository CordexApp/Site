import Link from "next/link";
import { ProviderServiceDetails } from "@/context/MyServicesContext";

interface ServiceManagementCardProps {
  service: ProviderServiceDetails;
}

export function ServiceManagementCard({ service }: ServiceManagementCardProps) {
  return (
    <div className="border border-gray-700 rounded-md p-4 hover:bg-gray-900 transition-colors">
      <Link href={`/manage-service/${service.providerContractAddress}`}>
        <div className="mb-3">
          <h3 className="text-xl font-bold mb-2 hover:text-blue-400">
            Service {service.providerContractAddress.substring(0, 6)}...
            {service.providerContractAddress.substring(38)}
          </h3>
          <div className="flex items-center mb-2">
            <span className="text-gray-400 mr-2">Status:</span>
            <span
              className={service.isActive ? "text-green-400" : "text-red-400"}
            >
              {service.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <p>
            <span className="text-gray-400">Contract:</span>{" "}
            {service.providerContractAddress}
          </p>
          {service.apiEndpoint && (
            <p>
              <span className="text-gray-400">API Endpoint:</span>{" "}
              {service.apiEndpoint}
            </p>
          )}
          {service.maxEscrow && (
            <p>
              <span className="text-gray-400">Max Escrow:</span>{" "}
              {service.maxEscrow} CRDX
            </p>
          )}
          {service.bondingCurveAddress && (
            <p>
              <span className="text-gray-400">Bonding Curve:</span>{" "}
              {service.bondingCurveAddress}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}
