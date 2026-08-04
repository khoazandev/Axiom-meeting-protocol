import { useState, useEffect, useRef, useCallback } from 'react';

export interface TranslationStream {
  type: string;
  id: string;
  original_text: string;
  vi_text: string;
  en_text: string;
  is_final: boolean;
}

export function useTranslationSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [streamData, setStreamData] = useState<TranslationStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // In Docker, we connect to localhost:8000 if exposed, or through Next.js proxy if mapped.
    // For Axiom, since realtime_stt is running in the FastAPI backend on port 8000.
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/realtime-stt';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = (e) => console.error('WebSocket error:', e);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'bilingual_translation_stream' || data.type === 'bilingual_translation') {
          setStreamData(data);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'translate', text }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connect, disconnect, sendText, streamData, isConnected };
}
