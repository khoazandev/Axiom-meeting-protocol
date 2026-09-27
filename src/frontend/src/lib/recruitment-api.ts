/**
 * Recruitment Pipeline API Client
 * Supports Owner pipeline, HR review workspace, and candidate portal.
 */

import { apiFetch } from './api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type RecruitmentStage =
  | 'INVITED'
  | 'ASSESSMENT_PENDING'
  | 'ASSESSMENT_SUBMITTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'HR_REVIEW_PENDING'
  | 'OWNER_APPROVAL_PENDING'
  | 'APPROVED'
  | 'ONBOARDING_INVITED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'CANCELLED';

export interface RecruitmentPolicy {
  id: string;
  organization_id: string;
  retention_days: number;
  created_at: string;
  updated_at: string;
}

export interface JobOpening {
  id: string;
  organization_id: string;
  department_id: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  created_by_id: string;
  assigned_hr_member_id?: string | null;
  requires_assessment: boolean;
  assessment_definition_id?: string | null;
  competency_rubric_json?: string | null;
  rubric_version: number;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  organization_id: string;
  email?: string | null;
  email_hash?: string | null;
  full_name?: string | null;
  phone?: string | null;
  cv_url?: string | null;
  notes?: string | null;
  redacted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AssessmentAttempt {
  id: string;
  application_id: string;
  definition_id?: string | null;
  definition_snapshot_json: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  score?: number | null;
  answers_json?: string | null;
  started_at?: string | null;
  submitted_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface InterviewSession {
  id: string;
  application_id: string;
  meeting_id: string;
  scheduled_at: string;
  interviewer_member_ids_json?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  consent_recording: boolean;
  consent_transcription: boolean;
  consent_ai_evaluation: boolean;
  consented_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface AIEvaluation {
  id: string;
  application_id: string;
  rubric_version: number;
  model_name?: string | null;
  summary?: string | null;
  scores_json?: string | null;
  evidence_json?: string | null;
  recommendation?: string | null;
  created_at: string;
}

export interface HRReview {
  id: string;
  application_id: string;
  reviewer_member_id: string;
  decision: 'HIRE' | 'NO_HIRE' | 'NEEDS_MORE_EVIDENCE';
  reason: string;
  ai_diff_reason?: string | null;
  created_at: string;
}

export interface OwnerApproval {
  id: string;
  application_id: string;
  approver_user_id: string;
  decision: 'APPROVE' | 'REJECT';
  reason?: string | null;
  onboarding_invitation_id?: string | null;
  created_at: string;
}

export interface RecruitmentApplication {
  id: string;
  organization_id: string;
  opening_id: string;
  candidate_id: string;
  assigned_hr_member_id?: string | null;
  stage: RecruitmentStage;
  version: number;
  consent_given: boolean;
  consent_timestamp?: string | null;
  terminal_at?: string | null;
  created_at: string;
  updated_at: string;

  opening?: JobOpening;
  candidate?: Candidate;
  assessment_attempts?: AssessmentAttempt[];
  interview_sessions?: InterviewSession[];
  ai_evaluations?: AIEvaluation[];
  hr_review?: HRReview | null;
  owner_approval?: OwnerApproval | null;
}

export interface RecruitmentMeResponse {
  role?: string | null;
  permissions: string[];
  department_ids: string[];
}

export interface IssueOnboardingResponse {
  invitation_id: string;
  application_id: string;
  raw_token: string;
  register_url: string;
  status: string;
}

export const recruitmentApi = {
  getContext: (orgId: string): Promise<RecruitmentMeResponse> =>
    apiFetch<RecruitmentMeResponse>(`/api/v1/organizations/${orgId}/recruitment/me`),

  getPolicy: (orgId: string): Promise<RecruitmentPolicy> =>
    apiFetch<RecruitmentPolicy>(`/api/v1/organizations/${orgId}/recruitment/policy`),

  updatePolicy: (orgId: string, retentionDays: number): Promise<RecruitmentPolicy> =>
    apiFetch<RecruitmentPolicy>(`/api/v1/organizations/${orgId}/recruitment/policy`, {
      method: 'PUT',
      body: JSON.stringify({ retention_days: retentionDays }),
    }),

  listOpenings: (orgId: string, status?: string): Promise<JobOpening[]> => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<JobOpening[]>(`/api/v1/organizations/${orgId}/recruitment/openings${q}`);
  },

  createOpening: (orgId: string, data: Partial<JobOpening>): Promise<JobOpening> =>
    apiFetch<JobOpening>(`/api/v1/organizations/${orgId}/recruitment/openings`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listApplications: (orgId: string, openingId?: string, stage?: string): Promise<RecruitmentApplication[]> => {
    const params = new URLSearchParams();
    if (openingId) params.append('opening_id', openingId);
    if (stage) params.append('stage', stage);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<RecruitmentApplication[]>(`/api/v1/organizations/${orgId}/recruitment/applications${qs}`);
  },

  getApplication: (orgId: string, applicationId: string): Promise<RecruitmentApplication> =>
    apiFetch<RecruitmentApplication>(`/api/v1/organizations/${orgId}/recruitment/applications/${applicationId}`),

  assignHR: (orgId: string, applicationId: string, assignedHrMemberId: string | null): Promise<RecruitmentApplication> =>
    apiFetch<RecruitmentApplication>(`/api/v1/organizations/${orgId}/recruitment/applications/${applicationId}/assign-hr`, {
      method: 'PUT',
      body: JSON.stringify({ assigned_hr_member_id: assignedHrMemberId }),
    }),

  toggleReviewGrant: (orgId: string, memberId: string, enabled: boolean): Promise<{ member_id: string; enabled: boolean }> =>
    apiFetch<{ member_id: string; enabled: boolean }>(`/api/v1/organizations/${orgId}/recruitment/managers/${memberId}/review-grant`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),

  submitHRReview: (
    orgId: string,
    application_id: string,
    data: { decision: string; reason: string; ai_diff_reason?: string; expected_version?: number }
  ): Promise<HRReview> =>
    apiFetch<HRReview>(`/api/v1/organizations/${orgId}/recruitment/applications/${application_id}/hr-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  runEvaluation: (orgId: string, applicationId: string): Promise<AIEvaluation> =>
    apiFetch<AIEvaluation>(`/api/v1/organizations/${orgId}/recruitment/applications/${applicationId}/ai-evaluations`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  submitOwnerApproval: (
    orgId: string,
    application_id: string,
    data: { decision: string; reason?: string; expected_version?: number }
  ): Promise<OwnerApproval> =>
    apiFetch<OwnerApproval>(`/api/v1/organizations/${orgId}/recruitment/applications/${application_id}/owner-approval`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  issueOnboarding: (
    orgId: string,
    application_id: string,
    idempotencyKey?: string
  ): Promise<IssueOnboardingResponse> =>
    apiFetch<IssueOnboardingResponse>(`/api/v1/organizations/${orgId}/recruitment/applications/${application_id}/issue-onboarding`, {
      method: 'POST',
      body: JSON.stringify({ idempotency_key: idempotencyKey }),
    }),
};

// ── Candidate Portal API (Uses Candidate JWT without Org ID header) ────────
export const candidateApi = {
  exchangeSession: async (token: string): Promise<{ access_token: string; token_type: string; expires_in: number; application_id: string; candidate_id: string }> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || 'Invalid or expired candidate invitation');
    }
    return res.json();
  },

  getMe: async (candidateToken: string): Promise<RecruitmentApplication> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/me`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || 'Failed to fetch candidate profile');
    }
    return res.json();
  },

  getAssessment: async (attemptId: string, candidateToken: string): Promise<AssessmentAttempt> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/assessments/${attemptId}`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || 'Failed to fetch assessment');
    }
    return res.json();
  },

  submitAssessment: async (attemptId: string, answers: Record<string, unknown>, candidateToken: string): Promise<AssessmentAttempt> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/assessments/${attemptId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || 'Failed to submit assessment');
    }
    return res.json();
  },

  recordConsent: async (
    interviewId: string,
    consent: { recording: boolean; transcription: boolean; ai_evaluation: boolean },
    candidateToken: string
  ): Promise<InterviewSession> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/interviews/${interviewId}/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify(consent),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || 'Failed to record consent');
    }
    return res.json();
  },

  getGuestAccess: async (interviewId: string, candidateToken: string): Promise<{ token: string; room_name: string; livekit_url: string }> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/interviews/${interviewId}/guest-access`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || 'Failed to obtain meeting access');
    }
    return res.json();
  },

  withdraw: async (candidateToken: string): Promise<RecruitmentApplication> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/withdraw`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || 'Failed to withdraw application');
    }
    return res.json();
  },
};
