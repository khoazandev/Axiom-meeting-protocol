/**
 * useMeetingEvents — WebSocket hook for meeting room events.
 *
 * Connects to /ws/meeting-events/{meetingId} and listens for:
 * - `meeting_ended`: Meeting was ended by host
 * - `tasks_preview`: New follow-up tasks extracted by AI
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { ActionItemResponse } from '@/lib/api';

export interface MeetingEvent {
  type:
    | 'meeting_ended'
    | 'tasks_preview'
    | 'tasks_extracting'
    | 'decisions_preview'
    | 'task_realtime_detected';
  data: Record<string, unknown>;
}

interface UseMeetingEventsOptions {
  meetingId: string;
  onMeetingEnded?: (data: Record<string, unknown>) => void;
  onTasksPreview?: (data: { tasks?: ActionItemResponse[] } & Record<string, unknown>) => void;
  onTasksExtracting?: (data: Record<string, unknown>) => void;
  onDecisionsPreview?: (data: Record<string, unknown>) => void;
  onTaskRealtimeDetected?: (task: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useMeetingEvents({
  meetingId,
  onMeetingEnded,
  onTasksPreview,
  onTasksExtracting,
  onDecisionsPreview,
  onTaskRealtimeDetected,
  enabled = true,
}: UseMeetingEventsOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => undefined);

  const callbacksRef = useRef({
    onMeetingEnded,
    onTasksPreview,
    onTasksExtracting,
    onDecisionsPreview,
    onTaskRealtimeDetected,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMeetingEnded,
      onTasksPreview,
      onTasksExtracting,
      onDecisionsPreview,
      onTaskRealtimeDetected,
    };
  }, [
    onMeetingEnded,
    onTasksPreview,
    onTasksExtracting,
    onDecisionsPreview,
    onTaskRealtimeDetected,
  ]);

  const connect = useCallback(() => {
    if (!meetingId || !enabled || !isMountedRef.current) return;

    // Avoid duplicate connection if already open or connecting
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Build WS URL dynamically — matches backend port 8001 or NEXT_PUBLIC_API_URL
    let wsUrl = '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    try {
      const urlObj = new URL(apiBase);
      const isSecure = urlObj.protocol === 'https:';
      const proto = isSecure ? 'wss:' : 'ws:';
      const port = urlObj.port || (isSecure ? '443' : '8001');
      const hostname =
        typeof window !== 'undefined' ? window.location.hostname : urlObj.hostname || 'localhost';
      wsUrl = `${proto}//${hostname}:${port}/ws/meeting-events/${meetingId}`;
    } catch {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      wsUrl = `ws://${hostname}:8001/ws/meeting-events/${meetingId}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MeetingEvents] WS connected:', meetingId, wsUrl);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: MeetingEvent = JSON.parse(event.data);

          switch (parsed.type) {
            case 'meeting_ended':
              console.log('[MeetingEvents] Meeting ended event received');
              callbacksRef.current.onMeetingEnded?.(parsed.data);
              break;
            case 'tasks_preview':
              console.log('[MeetingEvents] Tasks preview event received');
              callbacksRef.current.onTasksPreview?.(
                parsed.data as { tasks?: ActionItemResponse[] } & Record<string, unknown>
              );
              break;
            case 'task_realtime_detected':
              console.log('[MeetingEvents] Realtime task detected event:', parsed.data);
              callbacksRef.current.onTaskRealtimeDetected?.(
                ((parsed.data as { task?: Record<string, unknown> })?.task ||
                  parsed.data) as Record<string, unknown>
              );
              break;
            case 'decisions_preview':
              console.log('[MeetingEvents] Decisions preview event received');
              callbacksRef.current.onDecisionsPreview?.(parsed.data);
              break;
            case 'tasks_extracting':
              console.log('[MeetingEvents] Tasks extracting event:', parsed.data);
              callbacksRef.current.onTasksExtracting?.(parsed.data);
              break;
            default:
              console.log('[MeetingEvents] Unknown event type:', parsed.type);
          }
        } catch (err) {
          console.warn('[MeetingEvents] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect after 5s via connectRef
        if (enabled && isMountedRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectRef.current();
          }, 5000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[MeetingEvents] WS connection notice:', err);
      };
    } catch (err) {
      console.warn('[MeetingEvents] Failed to initialize WS connection:', err);
    }
  }, [meetingId, enabled]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
