"use client";

import { useState, useEffect } from "react";

interface LoadingDotsProps {
  className?: string;
  text?: string;
}

export function LoadingDots({
  className = "",
  text = "Loading",
}: LoadingDotsProps) {
  const [animationFrame, setAnimationFrame] = useState("⣾");

  useEffect(() => {
    const brailleSequence = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
    let currentIndex = 0;

    const interval = setInterval(() => {
      setAnimationFrame(brailleSequence[currentIndex]);
      currentIndex = (currentIndex + 1) % brailleSequence.length;
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex h-6 ${className}`}>
      <p className="font-mono min-w-[160px]">
        {animationFrame} {text}
      </p>
    </div>
  );
}
