import { ReactNode } from "react";
import { ServiceProvider } from "@/context/ServiceContext";

export default function ServiceLayout({ children }: { children: ReactNode }) {
  return (
    <ServiceProvider>
      <div className="flex flex-col min-h-screen bg-black text-white">
        {children}
      </div>
    </ServiceProvider>
  );
}
