import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-start justify-center min-h-screen px-4 md:px-32 font-mono bg-black text-white">
      <h1 className="text-3xl font-bold mb-2">Cordex</h1>
      <p className="text-lg mb-6 max-w-xl">
        Decentralized LLM Compute Network: Cheaper, trustless AI inference APIs
        powered by blockchain.
      </p>
      <div className="flex flex-col gap-4">
        <Link
          href="/protocol"
          className="px-4 py-2 border border-white hover:bg-white hover:text-black transition-colors"
        >
          See Protocol Overview
        </Link>
        <span className="text-base text-gray-400">Coming soon...</span>
      </div>
    </div>
  );
}
