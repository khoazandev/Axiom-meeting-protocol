/**
 * useMeetingEvents — WebSocket hook for meeting room events.
 *
 * Connects to /ws/meeting-sync/{meetingId} and listens for:
 * - `meeting_ended`: Meeting was ended by host
 * - `tasks_preview`: New follow-up tasks extracted by AI
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface MeetingEvent {
  type: 'meeting_ended' | 'tasks_preview' | 'tasks_extracting' | 'decisions_preview' | 'topic_extraction_done';
  data: any;
}

interface UseMeetingEventsOptions {
  meetingId: string;
  onMeetingEnded?: (data: any) => void;
  onTasksPreview?: (data: any) => void;
  onTasksExtracting?: (data: any) => void;
  onDecisionsPreview?: (data: any) => void;
  onTopicExtractionDone?: (data: any) => void;
  enabled?: boolean;
}

export function useMeetingEvents({
  meetingId,
  onMeetingEnded,
  onTasksPreview,
  onTasksExtracting,
  onDecisionsPreview,
  onTopicExtractionDone,
  enabled = true,
}: UseMeetingEventsOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!meetingId || !enabled) return;

    // Build WS URL based on NEXT_PUBLIC_API_URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    const wsBaseUrl = apiUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/ws/meeting-sync/${meetingId}`;

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
            case 'decisions_preview':
              console.log('[MeetingEvents] Decisions preview event received');
              onDecisionsPreview?.(parsed.data);
              break;
            case 'topic_extraction_done':
              console.log('[MeetingEvents] Topic extraction done event received');
              onTopicExtractionDone?.(parsed.data);
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
        // Prevent noisy errors in Strict Mode if we intentionally closed it while connecting
        if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
          console.error('[MeetingEvents] WS error:', err);
        }
      };
    } catch (err) {
      console.error('[MeetingEvents] Failed to connect:', err);
    }
  }, [meetingId, enabled, onMeetingEnded, onTasksPreview, onTasksExtracting, onDecisionsPreview, onTopicExtractionDone]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        if (ws.readyState === WebSocket.CONNECTING) {
          // If it's still connecting, wait for it to open before closing
          // This prevents the native browser "WebSocket is closed before the connection is established" warning
          ws.onopen = () => {
            ws.close();
          };
        } else {
          ws.close();
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
