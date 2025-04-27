import NextLink from "next/link";
import { SecondaryButton } from "@/ui/SecondaryButton";
import { Grid } from "@/ui/Grid";
import { getAllServices } from "@/api/services";

export default async function Home() {
  // Fetch services
  const services = await getAllServices();

  return (
    <div className="flex flex-col items-start justify-start min-h-[calc(100vh-80px)] px-4 md:px-32 py-8 bg-black text-white">
      <h1 className="text-3xl font-bold mb-2">
        monetize your service in minutes.
      </h1>
      <div className="flex gap-4 mb-8">
        <SecondaryButton href="/about">how it works</SecondaryButton>
        <SecondaryButton href="/launch">launch a service</SecondaryButton>
      </div>

      <h2 className="text-xl font-semibold mt-6">available services</h2>
      <Grid services={services} />
    </div>
  );
}
