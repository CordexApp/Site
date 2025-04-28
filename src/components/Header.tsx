"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full py-4 px-4 md:px-32 flex justify-between items-center bg-black text-white border-b border-gray-800">
      <div>
        <Link href="/" className="text-xl font-bold">
          Cordex
        </Link>
      </div>
      <nav className="flex items-center gap-6">
        <Link href="/protocol" className="hover:text-gray-300">
          Protocol
        </Link>
        <ConnectButton />
      </nav>
    </header>
  );
} 