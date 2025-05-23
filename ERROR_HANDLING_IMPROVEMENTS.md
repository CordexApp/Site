# Error Handling Improvements

This document outlines the fixes implemented to resolve common errors in the application.

## Issues Fixed

### 1. ResourceNotFoundRpcError: Requested resource not found

**Problem**: 
- RPC filter errors with Infura when using `eth_getFilterChanges`
- Filters expire on Infura after a certain time, causing "resource not found" errors
- These errors were flooding the console but didn't break functionality

**Root Cause**:
`useWatchContractEvent` was creating persistent filters that would expire on Infura's end, leading to failed `eth_getFilterChanges` calls.

**Solution**:
- **File**: `Site/src/hooks/useTokenDashboard.ts`
- **Changes**:
  - Added `poll: true` and `pollingInterval: 5000` to use polling instead of persistent filters
  - Improved error handling to distinguish between critical and non-critical errors
  - Filter/resource errors are now logged as warnings instead of errors

**Code Changes**:
```typescript
useWatchContractEvent({
  // ... other props
  poll: true, // Use polling instead of persistent filters
  pollingInterval: 5000, // Poll every 5 seconds
  onError(error) {
    const errorMessage = error.message || error.toString();
    if (errorMessage.includes('filter') || errorMessage.includes('resource not found')) {
      // These are common with Infura and not critical errors
      console.warn("[useTokenDashboard] Filter/resource error (non-critical):", errorMessage);
    } else {
      console.error("[useTokenDashboard] Event watching error:", error);
    }
  },
});
```

### 2. Failed to fetch OHLCV data: Service Unavailable

**Problem**:
- Backend server wasn't running, causing 503 Service Unavailable errors
- No retry logic for failed API calls
- Errors would break chart functionality

**Root Cause**:
- Backend server process had stopped running
- Frontend had no resilience against temporary server downtime

**Solution**:
- **Backend**: Started the server process (`python3 server.py`)
- **Frontend**: Added comprehensive retry logic with exponential backoff
- **Files**: `Site/src/services/tradingDataService.ts`

**Improvements Made**:

#### For OHLCV Data Fetching:
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout Handling**: 10-second timeout per request
- **Graceful Degradation**: Returns empty data instead of throwing errors
- **Better Error Classification**: Distinguishes between temporary and permanent errors

#### For Timeframes Fetching:
- **Retry Logic**: 2 attempts with linear backoff
- **Timeout Handling**: 8-second timeout per request  
- **Fallback**: Returns default "1h" timeframe if all attempts fail

**Code Changes**:
```typescript
export async function getOHLCVData(
  bondingCurveAddress: string,
  timeframe: string = "1h",
  limit: number = 1000,
  retries: number = 3
): Promise<OHLCVResponse> {
  const attempt = async (attemptNumber: number): Promise<OHLCVResponse> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      // Handle specific error codes and retry logic
      // ...
    } catch (error) {
      // Exponential backoff retry logic
      // ...
    }
  };
}
```

## Error Categorization

### Non-Critical Errors (Warnings)
- RPC filter expiration errors
- Service temporarily unavailable (503)
- Network timeouts during retries

### Critical Errors
- Authentication failures
- Invalid contract addresses
- Permanent service errors (4xx except 503)

## Benefits

1. **Reduced Console Noise**: Filter errors are now warnings instead of errors
2. **Better Resilience**: Automatic retry with backoff for temporary failures
3. **Graceful Degradation**: App continues working even when backend is temporarily down
4. **Improved User Experience**: Charts load with fallback data instead of failing completely
5. **Better Debugging**: Error logs now distinguish between critical and non-critical issues

## Monitoring

### For Developers
- Check console for warning patterns to identify recurring issues
- Monitor retry frequency to detect backend stability issues
- Critical errors still log as errors for immediate attention

### For Users
- Reduced error messages in developer console
- Charts continue working during temporary backend issues
- Faster recovery when backend comes back online

## Future Improvements

1. **Service Worker**: Cache API responses for offline functionality
2. **WebSocket Fallback**: Real-time updates when available, polling as fallback
3. **Health Check Integration**: Adjust retry behavior based on backend health
4. **Circuit Breaker**: Temporarily disable features when repeated failures occur
5. **User Notifications**: Inform users when operating in degraded mode

## Testing the Fixes

To verify the fixes work:

1. **RPC Errors**: Check browser console - should see warnings instead of errors
2. **Backend Downtime**: Stop the backend server and verify:
   - Charts show empty data instead of breaking
   - Retry attempts are logged
   - Service resumes when backend restarts
3. **Network Issues**: Use browser dev tools to throttle network and verify graceful handling 