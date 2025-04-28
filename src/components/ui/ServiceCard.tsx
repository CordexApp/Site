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
      className="flex flex-row items-center justify-start gap-4 p-4 border-1 border-white"
    >
      <div className="w-24 h-24 relative overflow-hidden">
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

      <div className="flex flex-col">
        <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
        <p className="text-sm text-gray-400 mb-2">{service.endpoint}</p>
      </div>
    </Link>
  );
}
