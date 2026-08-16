/**
 * useMeetingEvents — WebSocket hook for meeting room events.
 *
 * Connects to /ws/meeting-events/{meetingId} and listens for:
 * - `meeting_ended`: Meeting was ended by host
 * - `tasks_preview`: New follow-up tasks extracted by AI
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface MeetingEvent {
  type: 'meeting_ended' | 'tasks_preview' | 'tasks_extracting';
  data: any;
}

interface UseMeetingEventsOptions {
  meetingId: string;
  onMeetingEnded?: (data: any) => void;
  onTasksPreview?: (data: any) => void;
  onTasksExtracting?: (data: any) => void;
  enabled?: boolean;
}

export function useMeetingEvents({
  meetingId,
  onMeetingEnded,
  onTasksPreview,
  onTasksExtracting,
  enabled = true,
}: UseMeetingEventsOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!meetingId || !enabled) return;

    // Build WS URL — connect directly to backend port 8000
    // (same pattern as useTranslationSocket.ts to avoid Next.js proxy issues)
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const wsUrl = `ws://${hostname}:8000/ws/meeting-events/${meetingId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MeetingEvents] WS connected:', meetingId);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: MeetingEvent = JSON.parse(event.data);

          switch (parsed.type) {
            case 'meeting_ended':
              console.log('[MeetingEvents] Meeting ended event received');
              onMeetingEnded?.(parsed.data);
              break;
            case 'tasks_preview':
              console.log('[MeetingEvents] Tasks preview event received');
              onTasksPreview?.(parsed.data);
              break;
            case 'tasks_extracting':
              console.log('[MeetingEvents] Tasks extracting event:', parsed.data);
              onTasksExtracting?.(parsed.data);
              break;
            default:
              console.log('[MeetingEvents] Unknown event type:', parsed.type);
          }
        } catch (err) {
          console.error('[MeetingEvents] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[MeetingEvents] WS disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect after 5s (unless disabled)
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.onerror = (err) => {
        console.error('[MeetingEvents] WS error:', err);
      };
    } catch (err) {
      console.error('[MeetingEvents] Failed to connect:', err);
    }
  }, [meetingId, enabled, onMeetingEnded, onTasksPreview, onTasksExtracting]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
