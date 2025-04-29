"use client";

import { useRouter } from "next/navigation";

export default function ActionLinks() {
  const router = useRouter();

  return (
    <div className="mt-12 w-full border-t border-gray-700 pt-8">
      <h2 className="text-xl font-bold mb-4">actions</h2>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => router.push("/launch")} // Route to launch a new service
          className="border border-gray-600 hover:border-white px-4 py-2 rounded text-white transition-colors duration-150"
        >
          launch new service
        </button>

        <button
          onClick={() => router.push("/")} // Route to browse/home page
          className="border border-gray-600 hover:border-white px-4 py-2 rounded text-white transition-colors duration-150"
        >
          browse services
        </button>
      </div>
    </div>
  );
}
