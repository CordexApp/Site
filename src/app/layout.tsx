import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "./globals.css";
import NavigationBar from "@/components/NavigationBar";

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
        <NavigationBar />
        {children}
      </body>
    </html>
  );
}
