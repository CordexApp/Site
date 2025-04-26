"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamically import the PDF components with SSR disabled
const PDFViewer = dynamic(() => import("../../components/PDFViewer"), {
  ssr: false,
});

export default function ProtocolOverview() {
  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-black text-white">
      <div className="w-full max-w-5xl">
        <Link
          href="/"
          className="inline-block mb-6 text-white hover:text-gray-300"
        >
          ← Back to Home
        </Link>
        <div className="p-4">
          <PDFViewer pdfPath="/CordexOverview.pdf" />
        </div>
      </div>
    </div>
  );
}
