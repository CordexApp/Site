import { getServiceById } from "@/services/servicesService";
import { ServiceProvider } from "@/context/ServiceContext";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import Image from "next/image";
import { notFound } from "next/navigation";
import ServiceRequestFormWrapper from "@/components/ServiceRequestFormWrapper";
import ServiceHealthWrapper from "@/components/ServiceHealthWrapper";
import ContractStatusWrapper from "@/components/ContractStatusWrapper";
import ContractMaxEscrowWrapper from "@/components/ContractMaxEscrowWrapper";

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

  return (
    <ServiceProvider initialService={service}>
      <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-8">
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
                <p className="text-gray-400 mr-4">
                  Endpoint: {service.endpoint}
                </p>
                <ServiceHealthWrapper />
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-4">Contract:</p>
                <ContractStatusWrapper />
              </div>

              <div className="flex items-center">
                <p className="text-gray-400 mr-4">Escrow:</p>
                <ContractMaxEscrowWrapper />
              </div>
            </div>

            <p className="text-gray-300 mt-3 mb-6">
              Added: {new Date(service.created_at).toLocaleDateString()}
            </p>

            <div className="flex gap-4 mb-8">
              <SecondaryButton href="/">Back to Services</SecondaryButton>
            </div>

            <div className="w-full border-t border-gray-700 pt-6">
              <ServiceRequestFormWrapper />
            </div>
          </div>
        </div>
      </div>
    </ServiceProvider>
  );
}
