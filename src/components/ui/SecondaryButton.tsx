import React from "react";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function SecondaryButton({
  children,
  onClick,
  href,
  className = "",
  type = "button",
}: ButtonProps) {
  const baseClasses = "relative text-white font-medium group";
  const classes = `${baseClasses} ${className}`;

  const content = (
    <>
      {children}
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
