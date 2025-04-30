import React, { useState } from "react";

interface CopyableHashProps {
  hash: string;
  truncateLength?: number;
  className?: string;
}

export function CopyableHash({
  hash,
  truncateLength = 6,
  className = "",
}: CopyableHashProps) {
  const [copied, setCopied] = useState(false);

  if (!hash) return null;

  const truncatedHash =
    hash.length > truncateLength * 2
      ? `${hash.substring(0, truncateLength)}...${hash.substring(
          hash.length - truncateLength
        )}`
      : hash;

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={`${className}`}>
      <span className="break-all font-mono text-sm">{truncatedHash}</span>
      <button
        onClick={handleCopy}
        className="ml-2 text-xs text-gray-400 hover:text-white"
        title="Copy to clipboard"
      >
        {copied ? (
          <span className="text-green-400">Copied!</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
        )}
      </button>
    </span>
  );
}
