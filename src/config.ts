// API Configuration
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Timeframe Configuration
// Canonical order for timeframes (shortest to longest duration)
export const TIMEFRAME_ORDER = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

// Timeframe display labels for UI
export const TIMEFRAME_LABELS: Record<string, string> = {
  "1m": "1 min",
  "5m": "5 min", 
  "15m": "15 min",
  "1h": "1 hour",
  "4h": "4 hours",
  "1d": "1 day",
} as const;
