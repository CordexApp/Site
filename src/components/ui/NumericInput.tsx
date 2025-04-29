import React, { InputHTMLAttributes } from "react";
import { Input } from "./Input";

interface NumericInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  allowDecimal?: boolean;
}

export const NumericInput = React.forwardRef<
  HTMLInputElement,
  NumericInputProps
>(({ onChange, onKeyDown, onPaste, allowDecimal = true, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and a single decimal point if decimals are allowed
    const value = e.target.value;
    const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

    if (value === "" || regex.test(value)) {
      onChange?.(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow original keydown handler to execute first if provided
    onKeyDown?.(e);

    // If the event was already prevented, don't run our logic
    if (e.defaultPrevented) return;

    // Allow: numbers, decimal point (if enabled), navigation keys, and keyboard shortcuts
    const isDigit = /^\d$/.test(e.key);
    const isDecimalPoint = e.key === ".";
    const isNavigationKey = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ].includes(e.key);
    const isKeyboardShortcut = e.ctrlKey || e.metaKey;

    if (
      !isDigit &&
      !(isDecimalPoint && allowDecimal) &&
      !isNavigationKey &&
      !isKeyboardShortcut
    ) {
      e.preventDefault();
    }

    // Prevent multiple decimal points
    if (
      isDecimalPoint &&
      (e.currentTarget.value.includes(".") || !allowDecimal)
    ) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Allow original paste handler to execute first if provided
    onPaste?.(e);

    // If the event was already prevented, don't run our logic
    if (e.defaultPrevented) return;

    // Prevent pasting non-numeric text
    const pastedText = e.clipboardData.getData("text");
    const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

    if (!regex.test(pastedText)) {
      e.preventDefault();
    }
  };

  return (
    <Input
      ref={ref}
      type="text" // Using "text" instead of "number" for better control
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      {...props}
    />
  );
});

NumericInput.displayName = "NumericInput";
