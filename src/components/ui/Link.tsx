import React from "react";
import NextLink from "next/link";

interface LinkProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
}

export function Link({ children, href, className = "" }: LinkProps) {
  const baseClasses =
    "text-white font-medium hover:text-gray-300 transition-colors";
  const classes = `${baseClasses} ${className}`;

  return (
    <NextLink href={href || "#"} className={classes}>
      {children}
    </NextLink>
  );
}
