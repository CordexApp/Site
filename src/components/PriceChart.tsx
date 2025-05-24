"use client";

import { TIMEFRAME_LABELS, TIMEFRAME_ORDER } from "@/config";
import { OHLCVCandle } from "@/services/tradingDataService";
import {
    CandlestickData,
    CandlestickSeries,
    ColorType,
    createChart,
    IChartApi,
    ISeriesApi,
    UTCTimestamp
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

interface PriceChartProps {
  data: OHLCVCandle[];
  timeframe: string;
  onTimeframeChange?: (timeframe: string) => void;
  availableTimeframes?: string[];
  symbol?: string;
}

export default function PriceChart({
  data,
  timeframe,
  onTimeframeChange,
  availableTimeframes = [...TIMEFRAME_ORDER],
  symbol = "Token",
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastAppliedDataRef = useRef<CandlestickData[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastTimeframeChange, setLastTimeframeChange] = useState<number>(0);

  // Set up chart only once - no longer depends on timeframe
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#D1D5DB",
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      crosshair: {
        mode: 0, // Normal crosshair mode
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false, // Will be updated dynamically
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#33ff00",
      downColor: "#ff0000",
      borderDownColor: "#ff0000",
      borderUpColor: "#33ff00",
      wickDownColor: "#ff0000",
      wickUpColor: "#33ff00",
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
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []); // Only create chart once

  // Update timeScale options when timeframe changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        timeScale: {
          borderColor: "#334155",
          timeVisible: true,
          secondsVisible: timeframe === "1m" || timeframe === "5m",
        },
      });
    }
  }, [timeframe]);

  // Update chart data when data prop changes
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    // Handle empty data case
    if (!data || data.length === 0) {
      series.setData([]);
      lastAppliedDataRef.current = [];
      setIsTransitioning(false);
      return;
    }

    const newChartData: CandlestickData[] = data.map((candle) => ({
      time: candle.time as UTCTimestamp,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));

    const lastAppliedData = lastAppliedDataRef.current;

    // Check if this is likely an incremental update (polling)
    const isIncrementalUpdate =
      newChartData.length > 0 &&
      lastAppliedData.length > 0 &&
      newChartData[newChartData.length - 1].time >
        lastAppliedData[lastAppliedData.length - 1].time &&
      // Additional check: if the new data contains most of the previous data, it's incremental
      newChartData.length >= lastAppliedData.length;

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
      setIsTransitioning(false);
    } else {
      // Full data replacement (timeframe change or initial load)
      console.log(
        "[PriceChart] Setting full data (length: " + newChartData.length + ")"
      );
      
      // Add transition effect for timeframe changes
      if (lastAppliedData.length > 0) {
        setIsTransitioning(true);
        // Small delay to create smooth transition
        setTimeout(() => {
          series.setData(newChartData);
          lastAppliedDataRef.current = newChartData;
          chart.timeScale().fitContent();
          setIsTransitioning(false);
        }, 50);
      } else {
        // Initial load - no transition needed
        series.setData(newChartData);
        lastAppliedDataRef.current = newChartData;
        chart.timeScale().fitContent();
        setIsTransitioning(false);
      }
    }
  }, [data]);

  // Format display text for timeframe
  const formatTimeframe = (tf: string) => {
    return TIMEFRAME_LABELS[tf] || tf;
  };

  // Enhanced timeframe change handler with visual feedback and cooldown
  const handleTimeframeClick = (tf: string) => {
    if (tf === timeframe) return; // Don't do anything if same timeframe
    
    // Prevent rapid clicking (debounce)
    const now = Date.now();
    if (now - lastTimeframeChange < 200) return; // 200ms cooldown
    
    setLastTimeframeChange(now);
    setIsTransitioning(true);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-white">{symbol} / CRDX</h3>

        <div className="flex space-x-1">
          {availableTimeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeClick(tf)}
              disabled={isTransitioning}
              className={`px-2 py-1 text-xs hover:border-white cursor-pointer transition-all duration-200 ${
                timeframe === tf
                  ? "border-1 border-white text-white"
                  : "border-1 border-gray-700 text-white"
              } ${
                isTransitioning && tf === timeframe
                  ? "opacity-75 animate-pulse"
                  : ""
              } ${
                isTransitioning
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              {formatTimeframe(tf)}
            </button>
          ))}
        </div>
      </div>

      <div 
        ref={chartContainerRef} 
        className={`relative h-[400px] w-full transition-opacity duration-200 ${
          isTransitioning ? "opacity-90" : "opacity-100"
        }`}
      >
        {!data.length && !isTransitioning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-400">No trading data available</span>
          </div>
        )}
        {isTransitioning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black bg-opacity-50 px-3 py-1 rounded text-xs text-white">
              Loading {formatTimeframe(timeframe)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
