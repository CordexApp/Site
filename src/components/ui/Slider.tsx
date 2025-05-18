import { useCallback, useEffect, useState } from 'react';

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
}

export function Slider({
  min,
  max,
  step,
  value,
  onValueChange,
  className = '',
}: SliderProps) {
  const [position, setPosition] = useState(() => {
    const percentage = ((value[0] - min) / (max - min)) * 100;
    return percentage;
  });

  useEffect(() => {
    // Update position when value changes externally
    const percentage = ((value[0] - min) / (max - min)) * 100;
    setPosition(percentage);
  }, [value, min, max]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onValueChange([newValue]);
    },
    [onValueChange]
  );

  return (
    <div className={`w-full ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
} 