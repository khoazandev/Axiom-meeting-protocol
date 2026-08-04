/**
 * Axiom API Client
 *
 * Centralized API layer for all backend communication.
 * Auto-injects Authorization JWT token and X-Workspace-ID header.
 */

import { useAuthStore } from './store/useAuthStore';

// ── Types ────────────────────────────────────────────────

export interface Meeting {
  id: number;
  title: string;
  agenda: string;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
  workspace_id?: string | null;
}

export interface MeetingCreate {
  title: string;
  agenda: string;
  duration_minutes: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  provider: string;
  is_active: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  owner_id: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
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

export interface RagSource {
  type: 'agenda' | 'transcript' | 'file' | 'bookmark';
  snippet: string;
  filename?: string | null;
  timestamp?: number | null;
}

export interface RagQueryResponse {
  question: string;
  answer: string;
  sources: RagSource[];
  context_used: string[];
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

/**
 * Get auth headers from Zustand store. Use this instead of
 * manually reading localStorage — keys are managed centrally.
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('axiom_token') || useAuthStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const activeWorkspace = useAuthStore.getState().activeWorkspace;
    if (activeWorkspace?.id) {
      headers['X-Workspace-ID'] = activeWorkspace.id;
    }
  }
  return headers;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Inject token and active workspace header from localStorage / Zustand store
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('axiom_token') || useAuthStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const activeWorkspace = useAuthStore.getState().activeWorkspace;
    if (activeWorkspace?.id) {
      headers['X-Workspace-ID'] = activeWorkspace.id;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register')
    ) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }

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

// ── Auth API ─────────────────────────────────────────────

export const authApi = {
  register(email: string, password: string, full_name: string): Promise<User> {
    return apiFetch<User>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
  },

  login(email: string, password: string): Promise<AuthTokens> {
    return apiFetch<AuthTokens>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me(): Promise<User> {
    return apiFetch<User>('/api/v1/auth/me');
  },
};

// ── Workspace API ────────────────────────────────────────

export const workspaceApi = {
  create(name: string, slug: string): Promise<Workspace> {
    return apiFetch<Workspace>('/api/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
  },

  list(): Promise<Workspace[]> {
    return apiFetch<Workspace[]>('/api/v1/workspaces');
  },

  get(workspaceId: string): Promise<Workspace> {
    return apiFetch<Workspace>(`/api/v1/workspaces/${workspaceId}`);
  },
};

// ── Meeting API ──────────────────────────────────────────

export const meetingsApi = {
  /** List all meetings with optional pagination. */
  list(skip = 0, limit = 100, signal?: AbortSignal): Promise<Meeting[]> {
    return apiFetch<Meeting[]>(`/api/v1/meetings?skip=${skip}&limit=${limit}`, { signal });
  },

  /** Get a single meeting by ID. */
  get(id: number | string, signal?: AbortSignal): Promise<Meeting> {
    return apiFetch<Meeting>(`/api/v1/meetings/${id}`, { signal });
  },

  /** Create a new meeting. */
  create(data: MeetingCreate): Promise<Meeting> {
    return apiFetch<Meeting>('/api/v1/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Delete a meeting by ID. */
  delete(id: number | string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/v1/meetings/${id}`, {
      method: 'DELETE',
    });
  },

  /** Get a LiveKit token for a meeting room. */
  getToken(
    meetingId: number | string,
    participantName: string,
    signal?: AbortSignal
  ): Promise<TokenResponse> {
    return apiFetch<TokenResponse>(
      `/api/v1/meetings/${meetingId}/token?participant_name=${encodeURIComponent(participantName)}`,
      { signal }
    );
  },

  /** Query the in-meeting RAG chatbot. */
  ragQuery(
    meetingId: number | string,
    question: string,
    liveTranscript?: string,
    chatHistory?: { sender: string; text: string; isAi?: boolean }[]
  ): Promise<RagQueryResponse> {
    return apiFetch<RagQueryResponse>(`/api/v1/meetings/${meetingId}/rag/query`, {
      method: 'POST',
      body: JSON.stringify({
        question,
        live_transcript: liveTranscript,
        chat_history: chatHistory,
      }),
    });
  },
};
