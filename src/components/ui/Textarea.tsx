import React, { TextareaHTMLAttributes } from "react";
import { InputLabel } from "./InputLabel";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-2">
        {label && <InputLabel>{label}</InputLabel>}
        <textarea
          ref={ref}
          className={`px-4 py-2 placeholder:text-gray-700 bg-transparent border border-gray-700 focus:border-white transition-colors rounded focus:outline-none ${
            className || ""
          }`}
          {...props}
        />
      </div>
    );
  }
); 