import React, { ReactNode } from "react";

interface InputLabelProps {
  children: ReactNode;
}

export const InputLabel: React.FC<InputLabelProps> = ({ children }) => {
  return <label className="text-sm mb-1">&gt; {children}:</label>;
};

InputLabel.displayName = "InputLabel";
