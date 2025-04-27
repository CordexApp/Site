import React from "react";
import NextLink from "next/link";
import Image from "next/image";
import { PrimaryButton, Link } from "@/ui";

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
        <Link href="/about">About</Link>
        <PrimaryButton href="/launch">launch a service</PrimaryButton>
      </nav>
    </header>
  );
}
