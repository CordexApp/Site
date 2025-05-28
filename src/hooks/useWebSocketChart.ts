import { OHLCVCandle } from '@/services/tradingDataService';
import { useCallback, useEffect, useRef, useState } from 'react';

interface WebSocketChartData {
  [timeframe: string]: {
    candles: OHLCVCandle[];
    count: number;
  };
}

interface WebSocketMessage {
  type: 'initial_data' | 'chart_update' | 'pong' | 'data_response';
  bonding_curve_address?: string;
  data?: WebSocketChartData;
  timeframe?: string;
  candles?: OHLCVCandle[];
  count?: number;
  trade_data?: any;
  timestamp: number;
}

interface UseWebSocketChartProps {
  bondingCurveAddress: string | null;
  enabled?: boolean;
  onChartUpdate?: (data: WebSocketChartData, tradeData?: any) => void;
  onConnectionStatusChange?: (connected: boolean) => void;
}

interface UseWebSocketChartReturn {
  chartData: WebSocketChartData | null;
  isConnected: boolean;
  connectionError: string | null;
  requestData: (timeframe: string, limit?: number) => void;
  lastTradeData: any;
  reconnect: () => void;
}

export function useWebSocketChart({
  bondingCurveAddress,
  enabled = true,
  onChartUpdate,
  onConnectionStatusChange
}: UseWebSocketChartProps): UseWebSocketChartReturn {
  const [chartData, setChartData] = useState<WebSocketChartData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastTradeData, setLastTradeData] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Store callback refs to avoid infinite loops
  const onChartUpdateRef = useRef(onChartUpdate);
  const onConnectionStatusChangeRef = useRef(onConnectionStatusChange);
  
  // Update refs when callbacks change
  useEffect(() => {
    onChartUpdateRef.current = onChartUpdate;
  }, [onChartUpdate]);
  
  useEffect(() => {
    onConnectionStatusChangeRef.current = onConnectionStatusChange;
  }, [onConnectionStatusChange]);
  
  const connect = useCallback(() => {
    if (!bondingCurveAddress || !enabled) return;
    
    try {
      const wsUrl = `ws://localhost:8000/ws/chart/${bondingCurveAddress}`;
      console.log(`[WebSocket] Connecting to: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log(`[WebSocket] Connected to chart for ${bondingCurveAddress}`);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        onConnectionStatusChangeRef.current?.(true);
        
        // Start heartbeat
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000); // Ping every 30 seconds
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const currentTime = Date.now();
          const messageTime = message.timestamp * 1000; // Convert to ms
          const latency = currentTime - messageTime;
          
          console.log(`[WebSocket] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Received message: ${message.type} (latency: ${latency.toFixed(2)}ms)`);
          
          switch (message.type) {
            case 'initial_data':
              if (message.data) {
                console.log(`[WebSocket] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Setting initial chart data`);
                setChartData(message.data);
                onChartUpdateRef.current?.(message.data);
              }
              break;
              
            case 'chart_update':
              if (message.data) {
                console.log(`[WebSocket] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Chart update received for ${bondingCurveAddress} (latency: ${latency.toFixed(2)}ms)`);
                if (message.trade_data) {
                  console.log(`[WebSocket] [${new Date().toLocaleTimeString()}.${Date.now() % 1000}] Trade data included in update:`, message.trade_data);
                }
                setChartData(message.data);
                setLastTradeData(message.trade_data);
                onChartUpdateRef.current?.(message.data, message.trade_data);
              }
              break;
              
            case 'data_response':
              if (message.timeframe && message.candles) {
                setChartData(prev => ({
                  ...prev,
                  [message.timeframe!]: {
                    candles: message.candles!,
                    count: message.count || 0
                  }
                }));
              }
              break;
              
            case 'pong':
              // Heartbeat response
              break;
              
            default:
              console.log(`[WebSocket] Unknown message type: ${message.type}`);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        setConnectionError('WebSocket connection error');
      };
      
      ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed:`, event.code, event.reason);
        setIsConnected(false);
        onConnectionStatusChangeRef.current?.(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt to reconnect if it wasn't a clean close
        if (event.code !== 1000 && enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Max reconnection attempts reached');
        }
      };
      
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [bondingCurveAddress, enabled]);
  
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component cleanup');
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
  }, []);
  
  const requestData = useCallback((timeframe: string, limit: number = 100) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'request_data',
        timeframe,
        limit,
        timestamp: Date.now()
      }));
    }
  }, []);
  
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setConnectionError(null);
    setTimeout(connect, 1000);
  }, [disconnect, connect]);
  
  // Connect when component mounts or dependencies change
  useEffect(() => {
    if (bondingCurveAddress && enabled) {
      connect();
    }
    
    return disconnect;
  }, [bondingCurveAddress, enabled, connect, disconnect]);
  
  return {
    chartData,
    isConnected,
    connectionError,
    requestData,
    lastTradeData,
    reconnect
  };
} 