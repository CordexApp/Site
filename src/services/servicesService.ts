import { Service } from "@/types/service";

// Backend API URL - should be set in environment variables in production
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Cache for services to avoid redundant API calls - Removing for now due to pagination
// let servicesCache: Service[] | null = null;
// let servicesCacheKey: string | null = null; 
// let lastFetchTime: number = 0;
// const CACHE_EXPIRY_MS = 60000; // 1 minute cache

interface PaginatedServicesResponse {
  services: Service[];
  count: number;
  total_count: number;
}

interface CreateServiceRequest {
  name: string;
  endpoint: string;
  description?: string;
  image?: string;
  provider_contract_address?: string;
  coin_contract_address?: string;
  bonding_curve_address?: string;
  owner_wallet_address?: string;
  is_active?: boolean;
}

interface UpdateServiceRequest {
  name?: string;
  endpoint?: string;
  description?: string;
  image?: string;
  provider_contract_address?: string;
  coin_contract_address?: string;
  bonding_curve_address?: string;
  owner_wallet_address?: string;
}

export async function getServicesByOwnerOrAll(
  ownerWalletAddress?: string,
  limit?: number,
  offset?: number
): Promise<PaginatedServicesResponse> {
  // const now = Date.now();
  // const cacheKey = ownerWalletAddress || 'all'; 
  
  // if (servicesCache && servicesCacheKey === cacheKey && (now - lastFetchTime < CACHE_EXPIRY_MS)) {
  //   console.log(`[servicesService] Using cached services for key '${cacheKey}' (${servicesCache.length} items)`);
  //   // This part is problematic with pagination, as cache might not have the requested page
  //   // For simplicity, removing cache for this paginated function for now.
  //   return { services: servicesCache, count: servicesCache.length, total_count: servicesCache.length }; 
  // }
  
  try {
    let apiUrl = new URL(`${API_URL}/services`);
    if (ownerWalletAddress) {
      apiUrl.searchParams.append('owner_wallet_address', ownerWalletAddress);
    }
    if (limit !== undefined) {
      apiUrl.searchParams.append('limit', String(limit));
    }
    if (offset !== undefined) {
      apiUrl.searchParams.append('offset', String(offset));
    }
    
    console.log(`[servicesService] Fetching services from API: ${apiUrl.toString()}`);
    
    const response = await fetch(apiUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status}`);
    }

    const data: PaginatedServicesResponse = await response.json();
    
    // Caching is removed for now
    // servicesCache = data.services;
    // servicesCacheKey = cacheKey; 
    // lastFetchTime = now;
    
    console.log(`[servicesService] Fetched ${data.services.length} services from API (total: ${data.total_count})`);
    return data;
  } catch (error) {
    console.error("Error fetching services:", error);
    return { services: [], count: 0, total_count: 0 }; // Return empty on error
  }
}

export async function getServiceById(id: string): Promise<Service | null> {
  try {
    const response = await fetch(`${API_URL}/services/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch service: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[servicesService] Fetched service data successfully`);
    
    // Removing background cache refresh as it's not compatible with new paginated function signature
    // if (Date.now() - lastFetchTime > CACHE_EXPIRY_MS) {
    //   getServicesByOwnerOrAll().catch(e => console.error("[servicesService] Background cache refresh for 'all' failed:", e));
    // }
    
    return data as Service;
  } catch (error) {
    console.error(`Error fetching service ${id}:`, error);
    return null;
  }
}

export async function getServiceByContractAddress(
  contractAddress: string
): Promise<Service | null> {
  try {
    // First try to find the service in the cache - Removing cache lookup for now
    const normalizedAddress = contractAddress.toLowerCase();
    
    // If we have cached services, search there first
    // if (servicesCache && servicesCache.length > 0) { // servicesCache is removed
    //   console.log(`[servicesService] Looking for contract ${normalizedAddress} in cache (${servicesCache.length} items)`);
      
    //   const cachedService = servicesCache.find(
    //     service => service.provider_contract_address && 
    //     service.provider_contract_address.toLowerCase() === normalizedAddress
    //   );
      
    //   if (cachedService) {
    //     console.log(`[servicesService] Found service "${cachedService.name}" in cache for contract: ${normalizedAddress}`);
    //     return cachedService;
    //   }
      
    //   console.log(`[servicesService] Service not found in cache for contract: ${normalizedAddress}`);
    // }
    
    // Always fetch from API for now
    const apiUrl = `${API_URL}/services/contract/${normalizedAddress}`;
    console.log(`[servicesService] Fetching service by contract address: ${normalizedAddress}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[servicesService] Service not found (404) for contract: ${normalizedAddress}`);
        return null;
      }
      console.error(`[servicesService] Failed to fetch service: ${response.status}`);
      return null; // Return null instead of throwing for any error
    }
    
    const data = await response.json();
    console.log(`[servicesService] Fetched service data successfully`);
    
    // Removing background cache refresh as it's not compatible with new paginated function signature
    // if (Date.now() - lastFetchTime > CACHE_EXPIRY_MS) {
    //   getServicesByOwnerOrAll().catch(e => console.error("[servicesService] Background cache refresh for 'all' failed:", e));
    // }
    
    return data as Service;
  } catch (error) {
    console.error("[servicesService] Error fetching service by contract address:", error);
    return null;
  }
}

export async function createService(
  serviceData: CreateServiceRequest
): Promise<Service | null> {
  try {
    console.log("Creating service with data:", serviceData);
    console.log("API URL for service creation:", `${API_URL}/services`);

    const response = await fetch(`${API_URL}/services`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(
        `Failed to create service: ${response.status} - ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating service:", error);
    return null;
  }
}

export async function updateService(
  serviceId: string,
  updateData: UpdateServiceRequest
): Promise<Service | null> {
  try {
    const response = await fetch(`${API_URL}/services/${serviceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(
        `Failed to update service: ${response.status} - ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating service ${serviceId}:`, error);
    return null;
  }
}

export async function getUploadPresignedUrl(
  fileName: string,
  contentType: string,
  serviceId?: string
): Promise<{ presigned_url: string; object_key: string } | null> {
  try {
    const response = await fetch(`${API_URL}/upload/presigned-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_name: fileName,
        content_type: contentType,
        service_id: serviceId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting upload URL:", error);
    return null;
  }
}
