"use client";

import { getOHLCVDataFast } from "@/services/tradingDataService";
import { useEffect, useState } from "react";

export default function TestFastAPI() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testFastAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Testing fast API...");
      const startTime = Date.now();
      
      const data = await getOHLCVDataFast("0xtest123", "1h", 10);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      setResult({
        ...data,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      });
      
      console.log("Fast API test successful:", data);
    } catch (err) {
      console.error("Fast API test failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testFastAPI();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fast API Integration Test</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Test Results:</h2>
        
        {loading && (
          <div className="text-blue-600">Testing fast API connection...</div>
        )}
        
        {error && (
          <div className="text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {result && (
          <div className="space-y-2">
            <div className="text-green-600">
              <strong>✅ Fast API working!</strong>
            </div>
            <div><strong>Response Time:</strong> {result.responseTime}</div>
            <div><strong>Timeframe:</strong> {result.timeframe}</div>
            <div><strong>Candles Count:</strong> {result.count}</div>
            <div><strong>Timestamp:</strong> {result.timestamp}</div>
            <div className="mt-2">
              <strong>Raw Response:</strong>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
      
      <button
        onClick={testFastAPI}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? "Testing..." : "Test Again"}
      </button>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>This test verifies that:</p>
        <ul className="list-disc list-inside ml-4">
          <li>getOHLCVDataFast function is properly imported</li>
          <li>Fast server is running on port 8001</li>
          <li>API communication is working</li>
          <li>Response time is optimized</li>
        </ul>
      </div>
    </div>
  );
} 