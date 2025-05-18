import React, { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "", 
  ...props 
}) => {
  return (
    <div 
      className={`bg-gray-900 border border-gray-800 rounded-lg shadow-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}; 