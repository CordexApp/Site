"use client";

import { useState, useEffect } from "react";

interface ServiceHealthIndicatorProps {
  endpoint: string;
  bypassHealthCheck?: boolean;
}

interface HealthStatus {
  isHealthy: boolean;
  latency?: number;
  lastChecked: Date;
  message?: string;
}

export default function ServiceHealthIndicator({
  endpoint,
  bypassHealthCheck = false,
}: ServiceHealthIndicatorProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // If bypass is enabled, immediately set as healthy
    if (bypassHealthCheck) {
      setHealthStatus({
        isHealthy: true,
        lastChecked: new Date(),
        message: "Health check bypassed - Always healthy",
      });
      setIsLoading(false);
      return;
    }

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
  }, [endpoint, bypassHealthCheck]);

  if (isLoading && !healthStatus) {
    return (
      <span className="flex items-center">
        <span className="h-3 w-3 rounded-full bg-gray-400 mr-2"></span>
        <span className="text-sm text-gray-400">checking...</span>
      </span>
    );
  }

  if (!healthStatus) {
    return null;
  }

  return (
    <span className="flex items-center">
      <span
        className={`h-3 w-3 rounded-full ${
          healthStatus.isHealthy ? "bg-green-500" : "bg-cordex-red"
        } mr-2`}
      ></span>
      <span className="">
        {healthStatus.isHealthy ? "healthy" : "unhealthy"}
      </span>

      {/* Tooltip with detailed health info */}
      <div
        className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-black border border-gray-700 rounded-md shadow-lg 
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
    </span>
  );
}
