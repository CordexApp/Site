"use client";

import { LaunchServiceFlow } from '@/components/LaunchServiceFlow';

export default function LaunchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Launch Your Service</h1>
      <LaunchServiceFlow />
    </div>
  );
}
