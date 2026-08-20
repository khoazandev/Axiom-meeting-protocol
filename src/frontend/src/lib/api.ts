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

export interface ActionItemResponse {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  status: string;
  assignee_id?: string | null;
  due_date?: string | null;
  created_at: string;
}

export interface FollowUpTask {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  status: 'CONFIRMED' | 'NOT_CONFIRMED';
  assignee_id: string | null;
  assignee_name?: string | null;
  deadline: string | null;
  source: 'AI_REALTIME' | 'AI_FULL' | 'MANUAL';
  transcript_segment_id: string | null;
  created_at?: string;
}

export interface TranscriptResponse {
  id: string;
  meeting_id: string;
  content: string;
  speaker?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  sequence?: number;
  confidence?: string | null;
  created_at: string;
}

export interface MeetingEndResponse {
  meeting_id: string;
  status: string;
  summary: {
    id: string | null;
    content: string;
    key_points: string | null;
    decisions: string | null;
  } | null;
  follow_up_tasks: FollowUpTask[];
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
  ): Promise<TranscriptResponse> {
    return apiFetch<TranscriptResponse>(`/api/v1/meetings/${meetingId}/transcripts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Get follow-up tasks for a meeting. */
  getFollowUpTasks(meetingId: number | string): Promise<FollowUpTask[]> {
    return apiFetch<FollowUpTask[]>(`/api/v1/meetings/${meetingId}/follow-up-tasks`);
  },

  /** Create a manual follow-up task (HOST only). */
  createFollowUpTask(
    meetingId: number | string,
    data: { title: string; assignee_id?: string; deadline?: string }
  ): Promise<FollowUpTask> {
    return apiFetch<FollowUpTask>(`/api/v1/meetings/${meetingId}/follow-up-tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Update a follow-up task (HOST only). */
  updateFollowUpTask(
    meetingId: number | string,
    taskId: string,
    data: { title?: string; assignee_id?: string; deadline?: string; status?: string }
  ): Promise<FollowUpTask> {
    return apiFetch<FollowUpTask>(`/api/v1/meetings/${meetingId}/follow-up-tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Delete a follow-up task (HOST only). */
  deleteFollowUpTask(meetingId: number | string, taskId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/meetings/${meetingId}/follow-up-tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  /** End a meeting (HOST only). Triggers full extraction + summary + room close. */
  endMeeting(meetingId: number | string): Promise<MeetingEndResponse> {
    return apiFetch<MeetingEndResponse>(`/api/v1/meetings/${meetingId}/end`, {
      method: 'POST',
    });
  },

  /** @deprecated Use getFollowUpTasks instead */
  getActionItems(meetingId: number | string): Promise<any[]> {
    return apiFetch<any[]>(`/api/v1/meetings/${meetingId}/follow-up-tasks`);
  },

  /** Get transcripts for a meeting. */
  getTranscripts(meetingId: number | string): Promise<TranscriptResponse[]> {
    return apiFetch<TranscriptResponse[]>(`/api/v1/meetings/${meetingId}/transcripts`);
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

// ── Jira Types & API ──────────────────────────────────────
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  meeting_id?: string | null;
  organization_id?: string | null;
  department_id?: string | null;
  created_by_id: string;
  issue_counter: number;
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  duration?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  author_id: string;
  author_name?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  key: string;
  summary: string;
  description?: string | null;
  type: 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK' | string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  story_points?: number | null;
  parent_id?: string | null;
  epic_id?: string | null;
  sprint_id?: string | null;
  sprint_position: number;
  board_position: number;
  reporter_id: string;
  reporter_name?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  due_date?: string | null;
  meeting_id?: string | null;
  transcript_segment_id?: string | null;
  created_at: string;
  updated_at: string;
  comments?: IssueComment[];
  subtasks?: Issue[];
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const departmentApi = {
  list: async (orgId: string): Promise<Department[]> => {
    return apiFetch<Department[]>(`/api/v1/organizations/${orgId}/departments`);
  },
  create: async (orgId: string, data: { name: string; description?: string }): Promise<Department> => {
    return apiFetch<Department>(`/api/v1/organizations/${orgId}/departments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const jiraApi = {
  getProjects(params?: { department_id?: string; organization_id?: string }): Promise<JiraProject[]> {
    const q = new URLSearchParams();
    if (params?.department_id) q.set('department_id', params.department_id);
    if (params?.organization_id) q.set('organization_id', params.organization_id);
    const qs = q.toString();
    return apiFetch<JiraProject[]>(qs ? `/api/v1/jira/projects?${qs}` : '/api/v1/jira/projects');
  },

  createProject(data: {
    key: string;
    name: string;
    description?: string;
    meeting_id?: string;
    department_id?: string;
    organization_id?: string;
  }): Promise<JiraProject> {
    return apiFetch<JiraProject>('/api/v1/jira/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getProject(idOrKey: string): Promise<JiraProject> {
    return apiFetch<JiraProject>(`/api/v1/jira/projects/${idOrKey}`);
  },

  getSprints(projectIdOrKey: string, statusFilter?: string): Promise<Sprint[]> {
    const url = statusFilter
      ? `/api/v1/jira/projects/${projectIdOrKey}/sprints?status_filter=${statusFilter}`
      : `/api/v1/jira/projects/${projectIdOrKey}/sprints`;
    return apiFetch<Sprint[]>(url);
  },

  createSprint(data: { project_id: string; name: string; goal?: string; duration?: string }): Promise<Sprint> {
    return apiFetch<Sprint>('/api/v1/jira/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  startSprint(sprintId: string, data: { goal?: string; duration?: string; start_date?: string; end_date?: string }): Promise<Sprint> {
    return apiFetch<Sprint>(`/api/v1/jira/sprints/${sprintId}/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  completeSprint(sprintId: string, data: { move_incomplete_to_sprint_id?: string | null }): Promise<Sprint> {
    return apiFetch<Sprint>(`/api/v1/jira/sprints/${sprintId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSprint(sprintId: string, data: Partial<Sprint>): Promise<Sprint> {
    return apiFetch<Sprint>(`/api/v1/jira/sprints/${sprintId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getIssues(
    projectIdOrKey: string,
    params?: { sprint_id?: string; type_filter?: string; status_filter?: string; assignee_id?: string }
  ): Promise<Issue[]> {
    const query = new URLSearchParams();
    if (params?.sprint_id) query.append('sprint_id', params.sprint_id);
    if (params?.type_filter) query.append('type_filter', params.type_filter);
    if (params?.status_filter) query.append('status_filter', params.status_filter);
    if (params?.assignee_id) query.append('assignee_id', params.assignee_id);
    const qs = query.toString();
    return apiFetch<Issue[]>(`/api/v1/jira/projects/${projectIdOrKey}/issues${qs ? `?${qs}` : ''}`);
  },

  createIssue(data: {
    project_id: string;
    summary: string;
    description?: string;
    type?: string;
    status?: string;
    priority?: string;
    story_points?: number;
    parent_id?: string;
    epic_id?: string;
    sprint_id?: string;
    assignee_id?: string;
    due_date?: string;
    meeting_id?: string;
    transcript_segment_id?: string;
  }): Promise<Issue> {
    return apiFetch<Issue>('/api/v1/jira/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getIssue(issueIdOrKey: string): Promise<Issue> {
    return apiFetch<Issue>(`/api/v1/jira/issues/${issueIdOrKey}`);
  },

  updateIssue(issueIdOrKey: string, data: Partial<Issue>): Promise<Issue> {
    return apiFetch<Issue>(`/api/v1/jira/issues/${issueIdOrKey}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  reorderIssue(issueIdOrKey: string, data: { sprint_id?: string | null; status?: string; position: number }): Promise<Issue> {
    return apiFetch<Issue>(`/api/v1/jira/issues/${issueIdOrKey}/reorder`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteIssue(issueIdOrKey: string): Promise<void> {
    return apiFetch<void>(`/api/v1/jira/issues/${issueIdOrKey}`, {
      method: 'DELETE',
    });
  },

  addComment(issueIdOrKey: string, content: string): Promise<IssueComment> {
    return apiFetch<IssueComment>(`/api/v1/jira/issues/${issueIdOrKey}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  getMeetingWorkspace(meetingId: string): Promise<JiraProject> {
    return apiFetch<JiraProject>(`/api/v1/jira/meetings/${meetingId}/workspace`);
  },

  syncMeetingTasksToJira(meetingId: string, data: { project_key?: string; project_name?: string; target_project_id?: string }): Promise<Issue[]> {
    return apiFetch<Issue[]>(`/api/v1/jira/meetings/${meetingId}/sync-to-jira`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

