/**
 * Axiom API Client
 *
 * Centralized API layer for all backend communication.
 * Auto-injects Authorization JWT token and X-Organization-ID header.
 */

import { useAuthStore } from './store/useAuthStore';

// ── Types ────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  status: string;
  organization_id?: string | null;
  department_id?: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingCreate {
  title: string;
  description?: string | null;
  scheduled_at?: string | null;
  organization_id?: string | null;
  department_id?: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  provider: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
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
    const activeOrganization = useAuthStore.getState().activeOrganization;
    if (activeOrganization?.id) {
      headers['X-Organization-ID'] = activeOrganization.id;
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

  // Inject token and active organization header from localStorage / Zustand store
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('axiom_token') || useAuthStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const activeOrganization = useAuthStore.getState().activeOrganization;
    if (activeOrganization?.id) {
      headers['X-Organization-ID'] = activeOrganization.id;
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

// ── User API ─────────────────────────────────────────────

export interface UserSearchResult {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export interface MeetingMember {
  id: string;
  meeting_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export const usersApi = {
  /** Search users by email or name. */
  search(query: string, limit = 10): Promise<UserSearchResult[]> {
    return apiFetch<UserSearchResult[]>(
      `/api/v1/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  },
};

// ── Organization API ────────────────────────────────────────

export const organizationApi = {
  create(name: string): Promise<Organization> {
    return apiFetch<Organization>('/api/v1/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  list(): Promise<Organization[]> {
    return apiFetch<Organization[]>('/api/v1/organizations');
  },

  get(organizationId: string): Promise<Organization> {
    return apiFetch<Organization>(`/api/v1/organizations/${organizationId}`);
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

  /** Save a transcript segment. */
  saveTranscript(
    meetingId: number | string,
    data: {
      content: string;
      start_time: string;
      end_time: string;
      sequence: number;
      confidence?: string;
    }
  ): Promise<any> {
    return apiFetch(`/api/v1/meetings/${meetingId}/transcripts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Get action items for a meeting. */
  getActionItems(meetingId: number | string): Promise<any[]> {
    return apiFetch<any[]>(`/api/v1/meetings/${meetingId}/action-items`);
  },

  /** Get transcripts for a meeting. */
  getTranscripts(meetingId: number | string): Promise<any[]> {
    return apiFetch<any[]>(`/api/v1/meetings/${meetingId}/transcripts`);
  },

  /** List members of a meeting. */
  getMembers(meetingId: number | string): Promise<MeetingMember[]> {
    return apiFetch<MeetingMember[]>(`/api/v1/meetings/${meetingId}/members`);
  },

  /** Add a user as a member of a meeting. */
  addMember(
    meetingId: number | string,
    userId: string,
    role = 'PARTICIPANT'
  ): Promise<MeetingMember> {
    return apiFetch<MeetingMember>(`/api/v1/meetings/${meetingId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  },

  /** Remove a member from a meeting. */
  removeMember(meetingId: number | string, memberId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/meetings/${meetingId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  /** Get pending meeting invitations for current user. */
  getPendingInvitations(): Promise<PendingInvitation[]> {
    return apiFetch<PendingInvitation[]>('/api/v1/meetings/invitations/pending');
  },

  /** Accept a meeting invitation. */
  acceptInvitation(meetingId: string, memberId: string): Promise<MeetingMember> {
    return apiFetch<MeetingMember>(`/api/v1/meetings/${meetingId}/members/${memberId}/accept`, {
      method: 'POST',
    });
  },

  /** Decline a meeting invitation. */
  declineInvitation(meetingId: string, memberId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/meetings/${meetingId}/members/${memberId}/decline`, {
      method: 'POST',
    });
  },
};

export interface PendingInvitation {
  member_id: string;
  meeting_id: string;
  meeting_title: string;
  meeting_description: string | null;
  invited_by: string;
  invited_by_email: string;
  invited_at: string | null;
  role: string;
}
