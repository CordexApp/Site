import { Service } from "@/types/service";

// Backend API URL - should be set in environment variables in production
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ServicesResponse {
  services: Service[];
  count: number;
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

export async function getAllServices(): Promise<Service[]> {
  try {
    const response = await fetch(`${API_URL}/services`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status}`);
    }

    const data: ServicesResponse = await response.json();
    return data.services;
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
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

    return await response.json();
  } catch (error) {
    console.error(`Error fetching service ${id}:`, error);
    return null;
  }
}

export async function getServiceByContractAddress(
  contractAddress: string
): Promise<Service | null> {
  try {
    const response = await fetch(
      `${API_URL}/services/contract/${contractAddress}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch service by contract: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      `Error fetching service by contract ${contractAddress}:`,
      error
    );
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
