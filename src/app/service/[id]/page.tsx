import { getServiceById } from "@/services/servicesService";
import { ServiceProvider } from "@/context/ServiceContext";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import Image from "next/image";
import { notFound } from "next/navigation";
import ServiceRequestFormWrapper from "@/components/ServiceRequestFormWrapper";
import ServiceHealthIndicator from "@/components/ServiceHealthIndicator";
import ContractStatusIndicator from "@/components/ContractStatusIndicator";
import TokenDashboard from "@/components/TokenDashboard";
import { TypedText } from "@/components/ui/TypedText";

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
      <div className="flex gap-4 mb-8">
        <SecondaryButton href="/">back to services</SecondaryButton>
      </div>
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
                no image available
              </div>
            )}
          </div>

          <div className="flex flex-col w-full md:w-2/3">
            <TypedText
              text={service.name}
              className="text-3xl font-bold mb-2"
            />

            <div className="flex items-center space-x-6 mb-4">
              <div className="flex items-center">
                <p className="text-gray-400 mr-2">endpoint:</p>
                {endpoint ? (
                  <ServiceHealthIndicator
                    endpoint={endpoint}
                    bypassHealthCheck={true}
                  />
                ) : (
                  <span className="text-sm text-gray-400">none</span>
                )}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-2">contract:</p>
                {contractAddress ? (
                  <ContractStatusIndicator contractAddress={contractAddress} />
                ) : (
                  <span className="text-sm text-gray-400">none</span>
                )}
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-2">added:</p>
                <span className="ext-white">
                  {new Date(service.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="w-full">
              {endpoint && contractAddress ? (
                <ServiceRequestFormWrapper />
              ) : (
                <div className="p-4 bg-black rounded border border-gray-700">
                  <p className="text-yellow-400">
                    service not properly configured for api requests
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
