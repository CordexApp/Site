"use client";

import { createContext, useContext, ReactNode, useState } from "react";
import { Service } from "@/types/service";

interface ServiceContextType {
  service: Service | null;
  setService: (service: Service | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export function ServiceProvider({
  children,
  initialService = null,
}: {
  children: ReactNode;
  initialService?: Service | null;
}) {
  const [service, setService] = useState<Service | null>(initialService);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const value = {
    service,
    setService,
    loading,
    setLoading,
    error,
    setError,
  };

  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
}

export function useService() {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error("useService must be used within a ServiceProvider");
  }
  return context;
}
