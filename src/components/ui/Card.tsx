import React, { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'transparent';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "", 
  variant = 'default',
  ...props 
}) => {
  const baseStyles = "border rounded-lg shadow-lg";
  
  const variantStyles = {
    default: "bg-gray-900 border-gray-800",
    transparent: "bg-black/30 border-gray-700",
  };
  
  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}; 