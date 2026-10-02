/**
 * Realtime Notifications API Client
 */

import { apiFetch } from './api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unread_count: number;
}

export const notificationsApi = {
  list: (limit: number = 30): Promise<NotificationListResponse> =>
    apiFetch<NotificationListResponse>(`/api/v1/notifications?limit=${limit}`),

  markRead: (id: string): Promise<{ success: boolean }> =>
    apiFetch<{ success: boolean }>(`/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllRead: (): Promise<{ success: boolean }> =>
    apiFetch<{ success: boolean }>(`/api/v1/notifications/mark-all-read`, {
      method: 'POST',
    }),

  getStreamUrl: (): string => `${BASE_URL}/api/v1/notifications/stream`,
};
