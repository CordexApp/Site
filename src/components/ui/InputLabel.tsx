import React from "react";

interface InputLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const InputLabel: React.FC<InputLabelProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <label className={`text-sm font-medium text-gray-300 ${className}`}>
      {children}
    </label>
  );
};

InputLabel.displayName = "InputLabel";
