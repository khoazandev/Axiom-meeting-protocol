/**
 * Axiom API Client
 *
 * Centralized API layer for all backend communication.
 * Replaces scattered fetch() calls across components.
 *
 * Features:
 * - Typed request/response functions
 * - Consistent error handling
 * - Base URL from environment
 * - Prepared for JWT header injection (Phase 2)
 */

// ── Types ────────────────────────────────────────────────

export interface Meeting {
  id: number;
  title: string;
  agenda: string;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface MeetingCreate {
  title: string;
  agenda: string;
  duration_minutes: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    detail: string | null;
  };
}

export interface TokenResponse {
  token: string;
}

// ── Error Class ──────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail: string | null = null
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// ── Base Fetch ───────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  // Future: inject JWT token here
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: ApiError | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Response body is not JSON
    }

    if (errorData?.error) {
      throw new ApiRequestError(
        response.status,
        errorData.error.code,
        errorData.error.message,
        errorData.error.detail
      );
    }

    throw new ApiRequestError(
      response.status,
      'UNKNOWN_ERROR',
      `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

// ── Meeting API ──────────────────────────────────────────

export const meetingsApi = {
  /** List all meetings with optional pagination. */
  list(skip = 0, limit = 100, signal?: AbortSignal): Promise<Meeting[]> {
    return apiFetch<Meeting[]>(`/api/meetings/?skip=${skip}&limit=${limit}`, { signal });
  },

  /** Get a single meeting by ID. */
  get(id: number | string, signal?: AbortSignal): Promise<Meeting> {
    return apiFetch<Meeting>(`/api/meetings/${id}`, { signal });
  },

  /** Create a new meeting. */
  create(data: MeetingCreate): Promise<Meeting> {
    return apiFetch<Meeting>('/api/meetings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Delete a meeting by ID. */
  delete(id: number | string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/meetings/${id}`, {
      method: 'DELETE',
    });
  },

  /** Get a LiveKit token for a meeting room. */
  getToken(meetingId: number | string, participantName: string, signal?: AbortSignal): Promise<TokenResponse> {
    return apiFetch<TokenResponse>(
      `/api/meetings/${meetingId}/token?participant_name=${encodeURIComponent(participantName)}`,
      { signal }
    );
  },
};
