"use client";

import { Link, PrimaryButton } from "@/ui";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import NextLink from "next/link";
import { useAccount } from "wagmi";

export default function NavigationBar() {
  const { isConnected } = useAccount();
  
  return (
    <header className="w-full py-4 flex justify-between items-center bg-black text-white font-mono">
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
        
        {/* Connected - show my services link */}
        {isConnected && (
          <Link href="/my-services" className="hover:text-gray-300">
            my services
          </Link>
        )}
        
        {/* Launch service button */}
        <PrimaryButton href="/launch">launch a service</PrimaryButton>
        
        {/* Not connected - show connect button */}
        {!isConnected && (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="px-4 py-2 border border-white text-white font-medium hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                connect wallet
              </button>
            )}
          </ConnectButton.Custom>
        )}
        
        {/* Connected - show account display to the right */}
        {isConnected && (
          <ConnectButton.Custom>
            {({ account, openAccountModal }) => (
              <button
                onClick={openAccountModal}
                className="relative font-mono text-sm text-white hover:text-gray-300 transition-colors flex items-center group"
              >
                <span className="mr-1">[ </span>
                <span className="relative inline-block w-1.5 h-1.5 align-middle">
                  <span className="absolute inset-0 rounded-full bg-green-500 opacity-100 group-hover:opacity-50 transition-opacity"></span>
                </span>
                <span className="ml-1">{account?.displayName || "address"}</span>
                <span className="ml-1"> ]</span>
              </button>
            )}
          </ConnectButton.Custom>
        )}
      </nav>
    </header>
  );
}
