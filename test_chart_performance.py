#!/usr/bin/env python3
"""
Performance test script to measure chart update latencies.
This helps verify the impact of our optimizations.
"""

import time
import requests
import json
from datetime import datetime

def test_chart_api_response_time(bonding_curve_address, timeframe='1m'):
    """Test how fast the chart API responds."""
    start_time = time.time()
    
    try:
        # Replace with your actual API endpoint
        url = f"http://localhost:8000/api/ohlcv/{bonding_curve_address}?timeframe={timeframe}&limit=100"
        response = requests.get(url, timeout=10)
        end_time = time.time()
        
        if response.status_code == 200:
            data = response.json()
            latency = (end_time - start_time) * 1000  # Convert to milliseconds
            print(f"✅ Chart API Response Time: {latency:.2f}ms")
            print(f"📊 Returned {len(data)} candles for {timeframe} timeframe")
            return latency
        else:
            print(f"❌ API Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return None

def monitor_blockchain_listener_logs():
    """Monitor blockchain listener performance."""
    print("📡 Monitoring blockchain listener performance...")
    print("Check the logs for polling intervals and processing times.")
    print("Look for patterns like:")
    print("  - 'Processing X blocks from Y to Z' (should happen every 2-5 seconds)")
    print("  - 'Processed N trade events' (shows detection speed)")
    print("  - Any error messages about rate limits")

def simulate_performance_test():
    """Simulate a performance test scenario."""
    print("🚀 Chart Performance Test")
    print("=" * 50)
    
    # Test multiple timeframes
    timeframes = ['1m', '5m', '15m', '1h']
    bonding_curve_address = "0x1234567890123456789012345678901234567890"  # Replace with actual address
    
    for tf in timeframes:
        print(f"\n🔍 Testing {tf} timeframe...")
        latency = test_chart_api_response_time(bonding_curve_address, tf)
        
        if latency:
            if latency < 100:
                print(f"🟢 Excellent response time for {tf}")
            elif latency < 500:
                print(f"🟡 Good response time for {tf}")
            else:
                print(f"🔴 Slow response time for {tf}")
    
    print("\n📈 Frontend Polling Intervals (After Optimization):")
    print("  - 1m charts: 3 seconds")
    print("  - 5m charts: 5 seconds") 
    print("  - 15m charts: 8 seconds")
    print("  - 1h charts: 12 seconds")
    
    print("\n📡 Backend Polling (Set in .env):")
    print("  - POLLING_INTERVAL=2  # Blockchain listener")
    print("  - Contract events: 2 seconds")
    
    print("\n⚡ Expected Total Latency: 3-8 seconds (trade to chart)")

if __name__ == "__main__":
    simulate_performance_test()
    monitor_blockchain_listener_logs() 