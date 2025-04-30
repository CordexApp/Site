import React, { InputHTMLAttributes } from "react";
import { NumericInput } from "./NumericInput";

interface PercentageInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  min?: string;
  max?: string;
}

export const PercentageInput = React.forwardRef<
  HTMLInputElement,
  PercentageInputProps
>(({ className, onChange, min, max, ...props }, ref) => {
  // Handle change with bounds checking
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // First process with original handler
    onChange?.(e);

    // Then check bounds and auto-correct if needed
    const value = parseInt(e.target.value || "0", 10);
    const minValue = min ? parseInt(min, 10) : Number.MIN_SAFE_INTEGER;
    const maxValue = max ? parseInt(max, 10) : Number.MAX_SAFE_INTEGER;

    // Don't auto-correct if the field is empty (to allow typing)
    if (e.target.value === "") return;

    // Auto-correct out of bounds values
    if (!isNaN(value)) {
      if (value < minValue) {
        e.target.value = minValue.toString();
        // Trigger a synthetic change event with the corrected value
        const syntheticEvent = Object.create(e);
        onChange?.(syntheticEvent);
      } else if (value > maxValue) {
        e.target.value = maxValue.toString();
        // Trigger a synthetic event with the corrected value
        const syntheticEvent = Object.create(e);
        onChange?.(syntheticEvent);
      }
    }
  };

  return (
    <div className="relative">
      <NumericInput
        ref={ref}
        className={className}
        onChange={handleChange}
        allowDecimal={false}
        min={min}
        max={max}
        {...props}
      />
      <div className="absolute right-4 bottom-0 -translate-y-2">%</div>
    </div>
  );
});

PercentageInput.displayName = "PercentageInput";
