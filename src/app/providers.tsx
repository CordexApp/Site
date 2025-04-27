"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import * as React from "react";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

const config = getDefaultConfig({
  appName: "Cordex",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Get one from https://cloud.walletconnect.com
  chains: [mainnet, sepolia],
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
} 