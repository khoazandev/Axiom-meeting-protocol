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

/**
 * Debounce delay (ms) to wait for the best translation frame before
 * calling onFinalized. The backend pipeline sends:
 *   Frame 2 (CTranslate2, ~100ms) → Frame 3 (LLM refined, ~1-3s)
 * We wait 2.5s after the last is_final frame to capture the LLM result.
 */
const FINALIZE_DEBOUNCE_MS = 2500;

interface PendingFinal {
  entry: TranscriptHistoryEntry;
  timer: NodeJS.Timeout;
}

export function useTranslationSocket(
  speakerName = 'Thành viên',
  onFinalized?: (entry: TranscriptHistoryEntry) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [streamData, setStreamData] = useState<TranslationStream | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptHistoryEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
<<<<<<< HEAD
  const onFinalizedRef = useRef(onFinalized);

  useEffect(() => {
    onFinalizedRef.current = onFinalized;
  }, [onFinalized]);
=======
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pendingFinalRef = useRef<Map<string, PendingFinal>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalDisconnectRef = useRef(false);
>>>>>>> 521b68e (feat: RAG feedback learning + task extraction pipeline + real-time task broadcast)

  // Flush all pending entries immediately (called on disconnect)
  const flushPending = useCallback(() => {
    pendingFinalRef.current.forEach((pending, id) => {
      clearTimeout(pending.timer);
      if (!seenIdsRef.current.has(id)) {
        seenIdsRef.current.add(id);
        if (onFinalized) onFinalized(pending.entry);
      }
    });
    pendingFinalRef.current.clear();
  }, [onFinalized]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/realtime-stt';

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsConnected(true);
<<<<<<< HEAD
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => {
        console.warn('[STT] WebSocket connection unavailable — STT server may not be running.');
        setIsConnected(false);
=======
      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Flush any pending translations before reconnect
        flushPending();
        if (!isIntentionalDisconnectRef.current) {
          console.log('[STT] WS disconnected. Reconnecting in 3s...');
          reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
        }
      };
      ws.onerror = () => {
        console.warn('[STT] WebSocket connection unavailable — STT server may not be running.');
>>>>>>> 521b68e (feat: RAG feedback learning + task extraction pipeline + real-time task broadcast)
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

<<<<<<< HEAD
              if (onFinalizedRef.current) {
                onFinalizedRef.current(entry);
=======
              // Debounce onFinalized: wait for the best translation (LLM refined)
              // before saving to DB. Each new is_final frame resets the timer.
              if (!seenIdsRef.current.has(data.id)) {
                const existing = pendingFinalRef.current.get(data.id);
                if (existing?.timer) clearTimeout(existing.timer);

                const timer = setTimeout(() => {
                  const pending = pendingFinalRef.current.get(data.id);
                  if (pending && !seenIdsRef.current.has(data.id)) {
                    seenIdsRef.current.add(data.id);
                    if (onFinalized) onFinalized(pending.entry);
                  }
                  pendingFinalRef.current.delete(data.id);
                }, FINALIZE_DEBOUNCE_MS);

                pendingFinalRef.current.set(data.id, { entry, timer });
>>>>>>> 521b68e (feat: RAG feedback learning + task extraction pipeline + real-time task broadcast)
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
<<<<<<< HEAD
  }, [speakerName]);

  const disconnect = useCallback(() => {
=======
  }, [speakerName, onFinalized, flushPending]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    // Flush pending entries so no translations are lost
    flushPending();
>>>>>>> 521b68e (feat: RAG feedback learning + task extraction pipeline + real-time task broadcast)
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, [flushPending]);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'translate', text }));
    }
  }, []);

  return { connect, disconnect, sendText, streamData, isConnected, transcriptHistory };
}
