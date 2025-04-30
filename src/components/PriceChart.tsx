"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  CandlestickSeries,
} from "lightweight-charts";
import { OHLCVCandle } from "@/services/tradingDataService";

interface PriceChartProps {
  data: OHLCVCandle[];
  timeframe: string;
  onTimeframeChange?: (timeframe: string) => void;
  availableTimeframes?: string[];
  isLoading?: boolean;
  symbol?: string;
}

export default function PriceChart({
  data,
  timeframe,
  onTimeframeChange,
  availableTimeframes = ["1m", "5m", "15m", "1h", "4h", "1d"],
  isLoading = false,
  symbol = "Token",
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [series, setSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);

  // Set up chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear existing chart if exists
    if (chart) {
      chart.remove();
    }

    const newChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#1E293B" },
        textColor: "#D1D5DB",
      },
      grid: {
        vertLines: { color: "#334155" },
        horzLines: { color: "#334155" },
      },
      crosshair: {
        mode: 0, // Normal crosshair mode
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
    });

    const newSeries = newChart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderDownColor: "#EF4444",
      borderUpColor: "#10B981",
      wickDownColor: "#EF4444",
      wickUpColor: "#10B981",
    });

    setChart(newChart);
    setSeries(newSeries);

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && newChart) {
        newChart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      newChart.remove();
    };
  }, []);

  // Update chart data when data changes
  useEffect(() => {
    if (series && data && data.length > 0) {
      const chartData = data.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      }));

      series.setData(chartData);

      if (chart && chartData.length > 0) {
        // Fit content
        chart.timeScale().fitContent();
      }
    }
  }, [data, series, chart]);

  // Format display text for timeframe
  const formatTimeframe = (tf: string) => {
    switch (tf) {
      case "1m":
        return "1 min";
      case "5m":
        return "5 min";
      case "15m":
        return "15 min";
      case "1h":
        return "1 hour";
      case "4h":
        return "4 hours";
      case "1d":
        return "1 day";
      default:
        return tf;
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-200">
          {symbol} Price Chart
        </h3>

        <div className="flex space-x-1">
          {availableTimeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange && onTimeframeChange(tf)}
              className={`px-2 py-1 text-xs rounded ${
                timeframe === tf
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {formatTimeframe(tf)}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="relative h-[400px] w-full rounded-md border border-gray-700"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-gray-300 mt-2">Loading chart data...</span>
            </div>
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-400">No trading data available</span>
          </div>
        )}
      </div>
    </div>
  );
}
