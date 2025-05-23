"use client";

import { darkTheme, getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { http, WagmiProvider } from "wagmi";
import { optimismSepolia } from "wagmi/chains";

// Create a client
const queryClient = new QueryClient();

// Get Infura HTTP URL from environment variables
const infuraHttpUrl = process.env.NEXT_PUBLIC_INFURA_OP_SEPOLIA_HTTP_URL;

if (!infuraHttpUrl) {
  console.error(
    "CRITICAL: Infura HTTP URL (NEXT_PUBLIC_INFURA_OP_SEPOLIA_HTTP_URL) not found in environment variables. Application may not function correctly."
  );
  // You might want to throw an error here or use a public fallback, but be aware of limitations
  // infuraHttpUrl = "https://optimism-sepolia.blockpi.network/v1/rpc/public"; // Example public fallback
}

// Use getDefaultConfig for easy RainbowKit integration
const config = getDefaultConfig({
  appName: "Cordex",
  projectId: "9a72ea7c0025f0a48adf60a631546e99",
  chains: [optimismSepolia],
  transports: {
    // Use only the Infura HTTP transport
    [optimismSepolia.id]: http(infuraHttpUrl || undefined), // Use the env variable or undefined
    // Removed WebSocket configuration
  },
  ssr: true, // Keep SSR enabled if needed
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
