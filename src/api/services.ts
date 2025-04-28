import { Service } from "@/types/service";

// Backend API URL - should be set in environment variables in production
const API_URL = process.env.API_URL || "http://localhost:8000";

interface ServicesResponse {
  services: Service[];
  count: number;
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
