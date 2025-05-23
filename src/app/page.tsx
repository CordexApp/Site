import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  return (
    <div className="container mx-auto py-8 px-4 text-white flex flex-col items-start justify-center min-h-[calc(100vh-200px)]">
      <div className="mb-5">
        <Image
          src="/LogoCompactDark.svg"
          alt="Cordex Logo"
          width={180}
          height={60}
          priority
        />
      </div>
      <p className="text-lg text-gray-400">
        the first of its kind, a tokenized on-chain marketplace for API services
      </p>
      <p className="text-lg text-gray-400">launch. tokenize. earn.</p>
      <p className="text-lg text-gray-400 mt-5">coming soon.</p>
      <div className="mt-8">
        <Link 
          href="https://twitter.com/cordexdotapp" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-400"
        >
          @cordexdotapp
        </Link>
      </div>
    </div>
  );
}