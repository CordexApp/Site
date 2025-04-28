"use client";

import { Link, PrimaryButton } from "@/ui";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import NextLink from "next/link";

export default function NavigationBar() {
  return (
    <header className="w-full py-4 px-4 md:px-32 flex justify-between items-center bg-black text-white font-mono">
      <div className="logo">
        <NextLink href="/" className="text-xl font-bold">
          <Image
            src="/LogoCompactDark.svg"
            alt="Cordex Logo"
            width={120}
            height={40}
            priority
          />
        </NextLink>
      </div>
      <nav className="flex items-center space-x-6">
        <Link href="/about">how it works</Link>

        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="px-4 py-2 border border-white text-white font-medium hover:bg-white hover:text-black transition-colors cursor-pointer"
                      >
                        connect wallet
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={openChainModal}
                        className="px-2 py-1 text-sm border border-white text-white hover:bg-white hover:text-black transition-colors"
                      >
                        {chain.name}
                      </button>

                      <button
                        onClick={openAccountModal}
                        className="px-2 py-1 text-sm border border-white text-white hover:bg-white hover:text-black transition-colors"
                      >
                        {account.displayName}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
        <PrimaryButton href="/launch">launch a service</PrimaryButton>
      </nav>
    </header>
  );
}
