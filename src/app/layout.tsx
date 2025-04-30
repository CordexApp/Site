import NavigationBar from "@/components/NavigationBar";
import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Cordex",
  description: "Decentralized LLM Compute Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="bg-black min-h-screen text-white px-4 md:px-32">
            <NavigationBar />
            <div className="mt-16">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
