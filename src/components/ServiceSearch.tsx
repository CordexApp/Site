'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface ServiceSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
  debounceMs?: number; // Configurable debounce delay
}

export default function ServiceSearch({ 
  onSearch, 
  placeholder = "Search services...", 
  className = "",
  initialValue = "",
  debounceMs = 1000 // Default 1 second debounce
}: ServiceSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search effect
  useEffect(() => {
    // Don't search if the query hasn't changed from initial value on first render
    if (searchQuery === initialValue && initialValue !== '') {
      return;
    }

    // Don't search if query is empty and we're not clearing an existing search
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery === '' && initialValue === '') {
      return;
    }

    // Set searching state only for non-empty queries
    if (trimmedQuery !== '') {
      setIsSearching(true);
    }
    
    // Clear previous timeout and set new one
    const timeoutId = setTimeout(() => {
      onSearch(trimmedQuery);
      setIsSearching(false);
    }, debounceMs);

    // Cleanup timeout on unmount or when query changes
    return () => {
      clearTimeout(timeoutId);
      setIsSearching(false);
    };
  }, [searchQuery, onSearch, debounceMs, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Immediate search on form submit (bypass debounce)
    onSearch(searchQuery.trim());
    setIsSearching(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 pr-24 text-white bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
        />
        <MagnifyingGlassIcon 
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
            isSearching ? 'text-blue-400 animate-pulse' : 'text-gray-400'
          }`} 
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            title="Search now"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </div>
      </div>
      {isSearching && (
        <div className="absolute top-full left-0 mt-1 text-xs text-blue-400">
          Searching...
        </div>
      )}
    </form>
  );
} 