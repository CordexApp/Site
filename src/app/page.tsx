import NextLink from "next/link";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { Grid } from "@/ui/Grid";

export default async function Home() {
  return (
    <div className="flex flex-col items-start justify-center min-h-[calc(100vh-80px)] px-4 md:px-32 py-8 bg-black text-white">
      <h1 className="text-3xl font-bold mb-2">
        monetize your service in minutes.
      </h1>
      <p className="text-gray-400 mb-4">build an api service. list it. earn.</p>
      <p className="text-gray-800 mb-4">coming soon</p>
    </div>
  );
}
