'use client';

import { useRouter } from 'next/navigation';
import ServiceSearch from './ServiceSearch';

interface ServiceSearchWrapperProps {
  placeholder?: string;
  className?: string;
  initialQuery?: string;
  debounceMs?: number;
}

export default function ServiceSearchWrapper({ 
  placeholder, 
  className, 
  initialQuery = '',
  debounceMs = 800 // Slightly faster than default for better UX
}: ServiceSearchWrapperProps) {
  const router = useRouter();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/');
    }
  };

  return (
    <ServiceSearch 
      onSearch={handleSearch}
      placeholder={placeholder}
      className={className}
      initialValue={initialQuery}
      debounceMs={debounceMs}
    />
  );
} 