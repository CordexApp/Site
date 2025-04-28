"use client";

import dynamic from "next/dynamic";

// Dynamically import the PDF components with SSR disabled
const PDFViewer = dynamic(() => import("../../components/PDFViewer"), {
  ssr: false,
});

export default function ProtocolOverview() {
  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-72px)] p-4 bg-black text-white">
      <div className="w-full max-w-5xl">
        <div className="p-4">
          <PDFViewer pdfPath="/CordexOverview.pdf" />
        </div>
      </div>
    </div>
  );
}
