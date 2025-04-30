import React from "react";

interface CommaFormatterProps {
  value: string | number;
  className?: string;
}

export function CommaFormatter({ value, className = "" }: CommaFormatterProps) {
  // Convert value to string if it's a number
  const stringValue = typeof value === "number" ? value.toString() : value;

  // Format with commas for thousands
  const formatted = stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return <span className={className}>{formatted}</span>;
}
