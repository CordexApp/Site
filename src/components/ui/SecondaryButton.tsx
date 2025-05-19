import Link from "next/link";
import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function SecondaryButton({
  children,
  onClick,
  href,
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const baseClasses = "relative text-white font-medium group";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";
  const classes = `${baseClasses} ${disabledClasses} ${className}`;

  const content = (
    <>
      {children}
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white origin-left transform scale-x-100 transition-transform group-hover:scale-x-0"></span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  if (href && disabled) {
    // Return a button that looks like a link but is disabled
    return (
      <button disabled className={classes}>
        {content}
      </button>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}
