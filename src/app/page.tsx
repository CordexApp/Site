import ServiceList from "@/components/ServiceList";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TypedText } from "@/components/ui/TypedText";
import { getServicesByOwnerOrAll } from "@/services/servicesService";
import { Service } from "@/types/service";

const INITIAL_PAGE_LIMIT = 12;

export default async function Home() {
  // Fetch initial services (first page)
  const initialData = await getServicesByOwnerOrAll(undefined, INITIAL_PAGE_LIMIT, 0);
  const initialServices: Service[] = initialData.services;
  const totalServices = initialData.total_count;
  
  console.log(`[ServerPage] Initial services fetched: ${initialServices.length} of ${totalServices}`);

  return (
    <div className="container mx-auto py-8 px-4 text-white">
      <h1 className="text-4xl font-bold mb-4">
        <TypedText text="Monetize Your Service in Minutes" />
      </h1>
      <p className="text-lg text-gray-400 mb-8">Build an API service. List it. Earn.</p>
      <div className="flex gap-4 mb-12">
        <PrimaryButton href="/launch">Launch a Service</PrimaryButton>
      </div>

      <h2 className="text-2xl font-semibold mt-10 mb-6">Available Services</h2>
      <ServiceList initialServices={initialServices} totalServices={totalServices} initialLimit={INITIAL_PAGE_LIMIT} />
    </div>
  );
}
