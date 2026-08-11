import { useState, useRef, useCallback } from 'react';

export interface TranslationStream {
  type: string;
  id: string;
  original_text: string;
  vi_text: string;
  en_text: string;
  is_final: boolean;
  timestamp?: string;
}

export interface TranscriptHistoryEntry {
  id: string;
  vi_text: string;
  en_text: string;
  original_text: string;
  timestamp: string;
  speaker: string;
}

export function useTranslationSocket(
  speakerName = 'Thành viên',
  onFinalized?: (entry: TranscriptHistoryEntry) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [streamData, setStreamData] = useState<TranslationStream | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptHistoryEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalDisconnectRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;
    isIntentionalDisconnectRef.current = false;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    let wsUrl = '';
    if (baseUrl) {
      wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/realtime-stt';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Connect directly to backend (port 8000) to avoid Next.js WebSocket proxy ECONNRESET crashes
      wsUrl = `${protocol}//${window.location.hostname}:8000/ws/realtime-stt`;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (!isIntentionalDisconnectRef.current) {
          console.log('[STT] WS disconnected. Reconnecting in 3s...');
          reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
        }
      };
      ws.onerror = () => {
        console.warn('[STT] WebSocket connection unavailable — STT server may not be running.');
        // onclose will be called after onerror usually
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'bilingual_translation_stream' ||
            data.type === 'bilingual_translation'
          ) {
            setStreamData(data);

            // When a translation is final, add to transcript history
            if (data.is_final === true && (data.vi_text || data.en_text)) {
              const entry: TranscriptHistoryEntry = {
                id: data.id,
                vi_text: data.vi_text || data.original_text || '',
                en_text: data.en_text || '',
                original_text: data.original_text || '',
                timestamp: new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
                speaker: speakerName,
              };

              setTranscriptHistory((prev) => {
                // Upsert by id to avoid duplicates
                const existingIdx = prev.findIndex((e) => e.id === data.id);
                if (existingIdx !== -1) {
                  const updated = [...prev];
                  updated[existingIdx] = entry;
                  return updated;
                }
                return [...prev, entry];
              });

              if (!seenIdsRef.current.has(data.id)) {
                seenIdsRef.current.add(data.id);
                if (onFinalized) onFinalized(entry);
              }
            }
          }
        } catch (err) {
          console.error('Failed to parse WS message', err);
        }
      };

      wsRef.current = ws;
    } catch {
      console.warn('[STT] Could not create WebSocket connection');
    }
  }, [speakerName, onFinalized]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'translate', text }));
    }
  }, []);

  return { connect, disconnect, sendText, streamData, isConnected, transcriptHistory };
}
