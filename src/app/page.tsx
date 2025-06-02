import MarketplaceContent from "@/components/MarketplaceContent";
import ServiceSearchWrapper from "@/components/ServiceSearchWrapper";
import { TypedText } from "@/components/ui/TypedText";
import { getServicesByOwnerOrAll } from "@/services/servicesService";
import { Service } from "@/types/service";

const INITIAL_PAGE_LIMIT = 12;

interface HomeProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.search || '';
  
  // Fetch initial services (first page) with search query if provided
  const initialData = await getServicesByOwnerOrAll(undefined, INITIAL_PAGE_LIMIT, 0, searchQuery);
  const initialServices: Service[] = initialData.services;
  const totalServices = initialData.total_count;
  
  console.log(`[ServerPage] Initial services fetched: ${initialServices.length} of ${totalServices}${searchQuery ? ` (search: "${searchQuery}")` : ''}`);

  return (
    <div className="container mx-auto py-8 px-4 text-white">
      <h1 className="text-4xl font-bold mb-4">
        <TypedText text="Monetize Your Service in Minutes" />
      </h1>
      <p className="text-lg text-gray-400 mb-8">Build an API service. List it. Earn.</p>
      
      {/* Search Bar */}
      <div className="mb-12">
        <ServiceSearchWrapper 
          placeholder="Search services by name, description, or website..."
          className="max-w-2xl"
          initialQuery={searchQuery}
          debounceMs={600}
        />
      </div>

      <MarketplaceContent
        initialServices={initialServices}
        totalServices={totalServices}
        initialLimit={INITIAL_PAGE_LIMIT}
        searchQuery={searchQuery}
      />
    </div>
  );
}
