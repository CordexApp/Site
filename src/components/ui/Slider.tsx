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
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-400/50 slider-thumb-green"
          style={{
            backgroundImage: `linear-gradient(to right, white ${position}%, rgba(255, 255, 255, 0.1) ${position}%)`,
          }}
        />
        <style jsx>{`
          .slider-thumb-green::-webkit-slider-thumb {
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 2px solid #059669;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .slider-thumb-green::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 2px solid #059669;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
} 