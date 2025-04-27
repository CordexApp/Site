import Image from "next/image";
import Link from "next/link";
import { Service } from "@/types/service";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      href={`/service/${service.id}`}
      className="flex flex-row items-center justify-between p-4 bg-gray-900 rounded-md hover:bg-gray-800 transition-colors border border-gray-800"
    >
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
        <p className="text-sm text-gray-400 mb-2">{service.endpoint}</p>
      </div>

      <div className="w-16 h-16 relative rounded-md overflow-hidden">
        {service.image ? (
          <Image
            src={service.image}
            alt={service.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500">
            No img
          </div>
        )}
      </div>
    </Link>
  );
}
