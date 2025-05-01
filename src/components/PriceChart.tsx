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
  LastPriceAnimationMode,
  Time,
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
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastAppliedDataRef = useRef<CandlestickData[]>([]);

  // Set up chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
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
        secondsVisible: timeframe === "1m" || timeframe === "5m",
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderDownColor: "#EF4444",
      borderUpColor: "#10B981",
      wickDownColor: "#EF4444",
      wickUpColor: "#10B981",
      // lastPriceAnimation: LastPriceAnimationMode.Continuous, // Temporarily removed
    });

    chartRef.current = chart;
    seriesRef.current = series;
    lastAppliedDataRef.current = [];

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [timeframe]);

  // Update chart data when data prop changes
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || !data) return;

    const newChartData: CandlestickData[] = data.map((candle) => ({
      time: candle.time as UTCTimestamp,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));

    if (newChartData.length === 0) {
      series.setData([]);
      lastAppliedDataRef.current = [];
      return;
    }

    const lastAppliedData = lastAppliedDataRef.current;

    // Check if this is likely an incremental update (polling)
    // Condition: new data has 1+ items, last applied has items, last new candle time > last applied candle time
    const isIncrementalUpdate =
      newChartData.length > 0 &&
      lastAppliedData.length > 0 &&
      newChartData[newChartData.length - 1].time >
        lastAppliedData[lastAppliedData.length - 1].time;

    if (isIncrementalUpdate) {
      // Check if the update is just appending or replacing the last candle
      const newLastCandle = newChartData[newChartData.length - 1];
      const oldLastCandle = lastAppliedData[lastAppliedData.length - 1];

      if (newLastCandle.time === oldLastCandle.time) {
        // Update the last candle if timestamp is the same (current interval update)
        console.log("[PriceChart] Updating last candle:", newLastCandle);
        series.update(newLastCandle);
        lastAppliedDataRef.current[lastAppliedData.length - 1] = newLastCandle;
      } else {
        // Append the new candle if timestamp is different (new interval)
        console.log("[PriceChart] Appending new candle:", newLastCandle);
        series.update(newLastCandle);
        lastAppliedDataRef.current.push(newLastCandle);
        chart.timeScale().scrollToRealTime();
      }
    } else {
      // Otherwise, assume it's a full data replacement (initial load, timeframe change)
      console.log(
        "[PriceChart] Setting full data (length: " + newChartData.length + ")"
      );
      series.setData(newChartData);
      lastAppliedDataRef.current = newChartData;
      chart.timeScale().fitContent();
    }
  }, [data]);

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
