import ServiceList from "@/components/ServiceList";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TypedText } from "@/components/ui/TypedText";
import { getAllServices } from "@/services/servicesService";
import { Service } from "@/types/service";

export default async function Home() {
  // Fetch initial services
  let services: Service[] = await getAllServices();
  console.log("[ServerPage] Initial services fetched:", services.length);

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
      <ServiceList initialServices={services} />
    </div>
  );
}
