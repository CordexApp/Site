"use client";

import { ServiceLaunchProvider } from "@/context/ServiceLaunchContext";
import { ReactNode } from "react";

export default function LaunchLayout({ children }: { children: ReactNode }) {
  return <ServiceLaunchProvider>{children}</ServiceLaunchProvider>;
}
