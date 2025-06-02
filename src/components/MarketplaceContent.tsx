"use client";

import ServiceList from "@/components/ServiceList";
import SortButton, { SortDirection, SortOption } from "@/components/SortButton";
import { Service } from "@/types/service";
import Link from "next/link";
import { useState } from "react";

interface MarketplaceContentProps {
  initialServices: Service[];
  totalServices: number;
  initialLimit: number;
  searchQuery?: string;
}

export default function MarketplaceContent({ 
  initialServices, 
  totalServices, 
  initialLimit, 
  searchQuery 
}: MarketplaceContentProps) {
  // Sorting state - default to market cap (high to low)
  const [currentSort, setCurrentSort] = useState<SortOption>("marketcap");
  const [currentDirection, setCurrentDirection] = useState<SortDirection>("desc");
  const [isLoadingMarketCaps, setIsLoadingMarketCaps] = useState(false);

  const handleSortChange = (newSort: SortOption, newDirection: SortDirection) => {
    console.log(`[MarketplaceContent] Changing sort to: ${newSort} (${newDirection})`);
    setCurrentSort(newSort);
    setCurrentDirection(newDirection);
  };

  const handleMarketCapLoadingChange = (loading: boolean) => {
    setIsLoadingMarketCaps(loading);
  };

  return (
    <>
      {/* Header with Sort Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Available Services"}
            <span className="text-lg text-gray-400 ml-2">({totalServices} total)</span>
          </h2>
          {searchQuery && (
            <Link 
              href="/"
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              Clear Search
            </Link>
          )}
        </div>
        
        {/* Sort Controls */}
        <div>
          <SortButton 
            currentSort={currentSort}
            currentDirection={currentDirection}
            onSortChange={handleSortChange}
            isLoading={isLoadingMarketCaps}
          />
        </div>
      </div>
      
      <ServiceList 
        initialServices={initialServices} 
        totalServices={totalServices} 
        initialLimit={initialLimit}
        searchQuery={searchQuery}
        currentSort={currentSort}
        currentDirection={currentDirection}
        onMarketCapLoadingChange={handleMarketCapLoadingChange}
      />
    </>
  );
} 