"use client";

import { useState, useEffect } from "react";

interface ServiceHealthIndicatorProps {
  endpoint: string;
}

interface HealthStatus {
  isHealthy: boolean;
  latency?: number;
  lastChecked: Date;
  message?: string;
}

export default function ServiceHealthIndicator({
  endpoint,
}: ServiceHealthIndicatorProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkHealth = async () => {
      console.log(
        "[ServiceHealthIndicator] Checking health for endpoint:",
        endpoint
      );
      setIsLoading(true);

      try {
        // Construct health endpoint by appending /health to the base endpoint
        // Remove trailing slash if present
        const baseEndpoint = endpoint.endsWith("/")
          ? endpoint.slice(0, -1)
          : endpoint;
        const healthEndpoint = `${baseEndpoint}/health`;

        console.log(
          "[ServiceHealthIndicator] Sending request to health endpoint:",
          healthEndpoint
        );

        // Track start time for latency calculation
        const startTime = Date.now();

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Health check timed out")), 5000);
        });

        // Race the fetch with a timeout
        const response = (await Promise.race([
          fetch(healthEndpoint, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            // Cache: 'no-store' to ensure we get fresh data
            cache: "no-store",
          }),
          timeoutPromise,
        ])) as Response;

        // Calculate latency
        const latency = Date.now() - startTime;
        console.log(
          "[ServiceHealthIndicator] Health check response status:",
          response.status,
          "Latency:",
          latency,
          "ms"
        );

        if (response.ok) {
          const data = await response.json();
          console.log(
            "[ServiceHealthIndicator] Health check response data:",
            data
          );

          setHealthStatus({
            isHealthy: true,
            latency,
            lastChecked: new Date(),
            message: data.message || "Service is healthy",
          });
        } else {
          console.log(
            "[ServiceHealthIndicator] Health check failed with status:",
            response.status
          );

          setHealthStatus({
            isHealthy: false,
            latency,
            lastChecked: new Date(),
            message: `Error: HTTP ${response.status}`,
          });
        }
      } catch (error) {
        console.error("[ServiceHealthIndicator] Error checking health:", error);

        setHealthStatus({
          isHealthy: false,
          lastChecked: new Date(),
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (endpoint) {
      checkHealth();
    }

    // Set up polling to check health every 30 seconds
    const intervalId = setInterval(checkHealth, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [endpoint]);

  if (isLoading && !healthStatus) {
    return (
      <div className="flex items-center">
        <div className="h-3 w-3 rounded-full bg-gray-400 mr-2"></div>
        <span className="text-sm text-gray-400">Checking...</span>
      </div>
    );
  }

  if (!healthStatus) {
    return null;
  }

  return (
    <div className="flex items-center group relative">
      <div
        className={`h-3 w-3 rounded-full ${
          healthStatus.isHealthy ? "bg-green-500" : "bg-red-500"
        } mr-2`}
      ></div>
      <span className="text-sm text-gray-300">
        {healthStatus.isHealthy ? "Service online" : "Service offline"}
      </span>

      {/* Tooltip with detailed health info */}
      <div
        className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg 
                     text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10"
      >
        <p className="font-semibold mb-1">
          {healthStatus.isHealthy
            ? "Service is healthy"
            : "Service is unhealthy"}
        </p>
        {healthStatus.latency !== undefined && (
          <p className="text-gray-300">Latency: {healthStatus.latency}ms</p>
        )}
        <p className="text-gray-300">
          Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
        </p>
        {healthStatus.message && (
          <p className="text-gray-300 mt-1">{healthStatus.message}</p>
        )}
      </div>
    </div>
  );
}
