import ServiceLoader from "./ServiceLoader";

interface ServicePageProps {
  params: Promise<{
    id: string;
  }>;
}

// Make the component async and await params
export default async function ServicePage({ params }: ServicePageProps) {
  const resolvedParams = await params; // Await params
  const { id } = resolvedParams;

  // Render the ServiceLoader client component, which handles fetching and polling
  return <ServiceLoader id={id} />;
}
