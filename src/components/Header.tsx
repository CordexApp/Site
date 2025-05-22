"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount } from "wagmi";

export default function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="w-full py-4 px-4 md:px-32 flex justify-between items-center bg-black text-white border-b border-gray-800">
      <div>
        <Link href="/" className="text-xl font-bold">
          Cordex
        </Link>
      </div>
      <nav className="flex items-center space-x-6">
        <Link href="/about">how it works</Link>
        {isConnected && (
          <Link href="/my-services" className="hover:text-gray-300">
            My Services
          </Link>
        )}
        <ConnectButton />
      </nav>
    </header>
  );
} 