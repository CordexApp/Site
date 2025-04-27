import NextLink from "next/link";
import { SecondaryButton } from "@/ui/SecondaryButton";

export default function Home() {
  return (
    <div className="flex flex-col items-start justify-center min-h-[calc(100vh-80px)] px-4 md:px-32 font-mono bg-black text-white">
      <h1 className="text-3xl font-bold mb-2">
        monetize your service in minutes.
      </h1>
      <div className="flex gap-4">
        <SecondaryButton href="/about">how it works</SecondaryButton>
        <SecondaryButton href="/launch">launch a service</SecondaryButton>
      </div>
    </div>
  );
}
