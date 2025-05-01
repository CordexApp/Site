import { Service } from "@/types/service";
import { ServiceCard } from "./ServiceCard";

interface GridProps {
  services: Service[];
}

export function Grid({ services }: GridProps) {
  if (services.length === 0) {
    return (
      <div className="w-full mt-6 bg-gray-900 p-8 text-center">
        <p className="text-gray-400">No services available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full my-4">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
