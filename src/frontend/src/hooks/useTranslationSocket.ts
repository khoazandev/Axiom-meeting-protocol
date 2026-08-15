import { useState, useRef, useCallback, useEffect } from 'react';

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
  const onFinalizedRef = useRef(onFinalized);

  useEffect(() => {
    onFinalizedRef.current = onFinalized;
  }, [onFinalized]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/realtime-stt';

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => {
        console.warn('[STT] WebSocket connection unavailable — STT server may not be running.');
        setIsConnected(false);
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
              const timestamp = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const entry: TranscriptHistoryEntry = {
                id: data.id,
                vi_text: data.vi_text || data.original_text || '',
                en_text: data.en_text || '',
                original_text: data.original_text || '',
                timestamp,
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

              if (onFinalizedRef.current) {
                onFinalizedRef.current(entry);
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
  }, [speakerName]);

  const disconnect = useCallback(() => {
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
