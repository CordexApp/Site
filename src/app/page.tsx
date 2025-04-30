import NextLink from "next/link";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { Grid } from "@/ui/Grid";
import { getAllServices } from "@/services/servicesService";
import { TypedText } from "@/ui/TypedText";

export default async function Home() {
  // Fetch services
  const services = await getAllServices();

  return (
    <div className="">
      <h1>
        <TypedText text="monetize your service in minutes" />
      </h1>
      <p className="mb-4">build an api service. list it. earn.</p>
      <div className="flex gap-4 mb-8">
        <PrimaryButton href="/launch">launch a service</PrimaryButton>
      </div>

      <h2 className="text-xl font-semibold mt-6">available services</h2>
      <Grid services={services} />
    </div>
  );
}
