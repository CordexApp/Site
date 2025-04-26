"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import Link from "next/link";

export default function ProtocolOverview() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = Math.min(window.innerWidth * 0.9, 1000);
      setPageWidth(width);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize pdfjs worker on client only to avoid SSR window undefined
  useEffect(() => {
    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc =
        window.location.origin + "/pdf.worker.min.mjs" ||
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log("PDF loaded successfully with", numPages, "pages");
    setNumPages(numPages);
    setPdfError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load error:", error);
    setPdfError(error.message);
  }

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
          {pdfError && (
            <div className="text-red-500 mb-4 p-3 bg-red-100 bg-opacity-10">
              Error loading PDF: {pdfError}
            </div>
          )}
          <Document
            file="/CordexOverview.pdf"
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            className="flex flex-col items-center"
          >
            {Array.from(new Array(numPages || 0), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={pageWidth}
                className="mb-4"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
