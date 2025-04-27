import NavigationBar from "@/components/NavigationBar";
import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

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
      <body className={`${sourceCodePro.variable} antialiased`}>
        <Providers>
          <NavigationBar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
