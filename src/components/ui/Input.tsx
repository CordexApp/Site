import React, { InputHTMLAttributes } from "react";
import { InputLabel } from "./InputLabel";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <InputLabel>{label}</InputLabel>}
        <input
          ref={ref}
          className={`w-full px-4 py-2 placeholder:text-gray-700 bg-transparent border-b border-gray-700 focus:border-white transition-colors rounded-none focus:outline-none ${
            className || ""
          }`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
