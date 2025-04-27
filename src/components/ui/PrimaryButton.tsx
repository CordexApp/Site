import React from "react";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function PrimaryButton({
  children,
  onClick,
  href,
  className = "",
  type = "button",
}: ButtonProps) {
  const baseClasses =
    "px-4 py-2 border border-white text-white font-medium hover:bg-white hover:text-black transition-colors";
  const classes = `${baseClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
