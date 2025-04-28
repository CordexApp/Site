import React from "react";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function PrimaryButton({
  children,
  onClick,
  href,
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const baseClasses =
    "px-4 py-2 border border-white text-white font-medium hover:bg-white hover:text-black transition-colors";
  const classes = `${baseClasses} ${
    disabled ? "opacity-50 cursor-not-allowed" : ""
  } ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
