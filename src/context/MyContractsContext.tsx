"use client";

import { createContext, useContext, ReactNode, useState } from "react";
import useMyContracts, { UseMyContractsReturn } from "@/hooks/useMyContracts";

// Define the shape of the context data
// We'll reuse the return type from the hook
type MyContractsContextType = UseMyContractsReturn | null;

// Create the context
const MyContractsContext = createContext<MyContractsContextType>(null);

// Create the provider component
interface MyContractsProviderProps {
  children: ReactNode;
}

export function MyContractsProvider({ children }: MyContractsProviderProps) {
  const myContractsData = useMyContracts();

  return (
    <MyContractsContext.Provider value={myContractsData}>
      {children}
    </MyContractsContext.Provider>
  );
}

// Custom hook to use the context
export function useMyContractsContext() {
  const context = useContext(MyContractsContext);
  if (!context) {
    throw new Error(
      "useMyContractsContext must be used within a MyContractsProvider"
    );
  }
  return context;
}
