"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { WagmiProvider } from "wagmi";
import { optimismSepolia } from "wagmi/chains";

// Create a client
const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: "Cordex",
  // TODO: Replace with your WalletConnect project ID from https://cloud.walletconnect.com
  projectId: "9a72ea7c0025f0a48adf60a631546e99",
  chains: [optimismSepolia],

});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 