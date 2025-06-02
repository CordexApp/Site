"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export type SortOption = "alphabetical" | "marketcap" | "dateadded";
export type SortDirection = "asc" | "desc";

interface SortButtonProps {
  currentSort: SortOption;
  currentDirection: SortDirection;
  onSortChange: (sort: SortOption, direction: SortDirection) => void;
  isLoading?: boolean;
}

const sortOptions: { 
  value: SortOption; 
  label: string; 
  ascDescription: string;
  descDescription: string;
}[] = [
  { 
    value: "alphabetical", 
    label: "Alphabetical", 
    ascDescription: "a to z",
    descDescription: "z to a"
  },
  { 
    value: "marketcap", 
    label: "Market Cap", 
    ascDescription: "howest to highest",
    descDescription: "highest to lowest"
  },
  { 
    value: "dateadded", 
    label: "Date Added", 
    ascDescription: "oldest first",
    descDescription: "newest first"
  },
];

export default function SortButton({ currentSort, currentDirection, onSortChange, isLoading }: SortButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = sortOptions.find(option => option.value === currentSort);
  const currentDescription = currentDirection === "asc" 
    ? currentOption?.ascDescription 
    : currentOption?.descDescription;

  const handleSortSelect = (sort: SortOption) => {
    // If selecting the same sort option, keep current direction
    // If selecting a different sort option, use default direction for that option
    let newDirection: SortDirection;
    if (sort === currentSort) {
      newDirection = currentDirection;
    } else {
      // Default directions for each sort type
      switch (sort) {
        case "alphabetical":
          newDirection = "asc"; // A-Z by default
          break;
        case "marketcap":
          newDirection = "desc"; // Highest first by default
          break;
        case "dateadded":
          newDirection = "desc"; // Newest first by default
          break;
        default:
          newDirection = "asc";
      }
    }
    
    onSortChange(sort, newDirection);
    setIsOpen(false);
  };

  const handleDirectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from opening
    const newDirection: SortDirection = currentDirection === "asc" ? "desc" : "asc";
    onSortChange(currentSort, newDirection);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Direction Toggle Button */}
        <button
          onClick={handleDirectionToggle}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Currently: ${currentDescription}. Click to toggle direction.`}
        >
          {currentDirection === "asc" ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : (
            <ArrowDownIcon className="h-4 w-4" />
          )}
        </button>

        {/* Main Sort Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-sm">
            Sort by: {currentOption?.label || "Unknown"}
          </span>
          <ChevronDownIcon 
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
          {isLoading && (
            <div className="ml-1">
              <div className="animate-spin h-3 w-3 border border-gray-400 border-t-white rounded-full"></div>
            </div>
          )}
        </button>
      </div>

      {/* Current sort description */}
      <div className="text-xs text-gray-400 mt-1 text-right">
        {currentDescription}
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortSelect(option.value)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                currentSort === option.value ? 'bg-gray-700 text-blue-400' : 'text-white'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-gray-400 mt-1">
                {currentSort === option.value ? (
                  <div className="space-y-1">
                    <div className={currentDirection === "asc" ? "text-blue-300" : ""}>
                      ↑ {option.ascDescription}
                    </div>
                    <div className={currentDirection === "desc" ? "text-blue-300" : ""}>
                      ↓ {option.descDescription}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>↑ {option.ascDescription}</div>
                    <div>↓ {option.descDescription}</div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 