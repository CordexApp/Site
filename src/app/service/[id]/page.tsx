import { getServiceById } from "@/services/servicesService";
import { ServiceProvider } from "@/context/ServiceContext";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import Image from "next/image";
import { notFound } from "next/navigation";
import ServiceRequestFormWrapper from "@/components/ServiceRequestFormWrapper";
import ServiceHealthIndicator from "@/components/ServiceHealthIndicator";
import ContractStatusIndicator from "@/components/ContractStatusIndicator";
import ContractMaxEscrowIndicator from "@/components/ContractMaxEscrowIndicator";
import TokenDashboard from "@/components/TokenDashboard";

interface ServicePageProps {
  params: {
    id: string;
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { id } = params;
  const service = await getServiceById(id);

  if (!service) {
    notFound();
  }

  const endpoint = service.endpoint || "";
  const contractAddress = service.provider_contract_address || "";

  return (
    <ServiceProvider initialService={service}>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] py-8">
        <div className="flex flex-col md:flex-row w-full gap-8">
          <div className="w-full md:w-1/3 relative aspect-square overflow-hidden mb-4 md:mb-0">
            {service.image ? (
              <Image
                src={service.image}
                alt={service.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500">
                No image available
              </div>
            )}
          </div>

          <div className="flex flex-col w-full md:w-2/3">
            <h1 className="text-3xl font-bold mb-2">{service.name}</h1>

            <div className="flex flex-col space-y-3">
              <div className="flex items-center">
                <p className="text-gray-400 mr-4">Endpoint: {endpoint}</p>
                {endpoint ? (
                  <ServiceHealthIndicator endpoint={endpoint} />
                ) : (
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-gray-400 mr-2"></div>
                    <span className="text-sm text-gray-400">
                      No endpoint available
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-4">Contract:</p>
                {contractAddress ? (
                  <ContractStatusIndicator contractAddress={contractAddress} />
                ) : (
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-gray-400 mr-2"></div>
                    <span className="text-sm text-gray-400">
                      No contract linked
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-4">Escrow:</p>
                {contractAddress ? (
                  <ContractMaxEscrowIndicator
                    contractAddress={contractAddress}
                  />
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-400">
                      No contract linked
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-300 mt-3 mb-6">
              Added: {new Date(service.created_at).toLocaleDateString()}
            </p>

            <div className="flex gap-4 mb-8">
              <SecondaryButton href="/">Back to Services</SecondaryButton>
            </div>

            <div className="w-full border-t border-gray-700 pt-6">
              {endpoint && contractAddress ? (
                <ServiceRequestFormWrapper />
              ) : (
                <div className="p-4 bg-black rounded border border-gray-700">
                  <p className="text-yellow-400">
                    Service not properly configured for API requests
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        {contractAddress && (
          <div className="w-full">
            <TokenDashboard
              providerContractAddress={contractAddress as `0x${string}`}
            />
          </div>
        )}
      </div>
    </ServiceProvider>
  );
}
