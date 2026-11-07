/**
 * Recruitment Pipeline API Client
 * Supports Owner pipeline, HR review workspace, and candidate portal.
 */

import { apiFetch } from './api';
import { useAuthStore } from './store/useAuthStore';

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
  department?: { id: string; name: string };
  title: string;
  description?: string | null;
  requirements?: string | null;
  salary_range?: string | null;
  level?: string | null;
  work_type?: string | null;
  location?: string | null;
  benefits?: string | null;
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

export interface AssessmentQuestion {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TEXT' | 'CODE';
  options?: string[];
  required?: boolean;
}

export interface AssessmentAttempt {
  id: string;
  application_id: string;
  definition_id?: string | null;
  definition_snapshot_json: string;
  questions_snapshot?: AssessmentQuestion[];
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
  scheduled_start_at?: string;
  scheduled_end_at?: string;
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
  job_opening?: JobOpening;
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

  updateOpening: (orgId: string, openingId: string, data: Partial<JobOpening>): Promise<JobOpening> =>
    apiFetch<JobOpening>(`/api/v1/organizations/${orgId}/recruitment/openings/${openingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteOpening: (orgId: string, openingId: string): Promise<{ success: boolean; message: string }> =>
    apiFetch<{ success: boolean; message: string }>(`/api/v1/organizations/${orgId}/recruitment/openings/${openingId}`, {
      method: 'DELETE',
    }),

  createAssessmentDefinition: (
    orgId: string,
    data: { title: string; description?: string; duration_minutes: number; questions_json: string }
  ): Promise<{ id: string; title: string }> =>
    apiFetch<{ id: string; title: string }>(`/api/v1/organizations/${orgId}/recruitment/assessments`, {
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

  getReviewGrants: (orgId: string): Promise<Array<{ member_id: string; enabled: boolean }>> =>
    apiFetch<Array<{ member_id: string; enabled: boolean }>>(`/api/v1/organizations/${orgId}/recruitment/managers/review-grants`),

  toggleReviewGrant: (orgId: string, memberId: string, enabled: boolean): Promise<{ member_id: string; enabled: boolean }> =>
    apiFetch<{ member_id: string; enabled: boolean }>(`/api/v1/organizations/${orgId}/recruitment/managers/${memberId}/review-grant`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),

  approveCV: (
    orgId: string,
    application_id: string,
    data: { decision: 'APPROVE' | 'REJECT'; reason?: string; expected_version?: number }
  ): Promise<{ success: boolean; stage: string; message: string }> =>
    apiFetch<{ success: boolean; stage: string; message: string }>(
      `/api/v1/organizations/${orgId}/recruitment/applications/${application_id}/cv-approval`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  rejectApplication: (
    orgId: string,
    application_id: string,
    data?: { reason?: string; expected_version?: number }
  ): Promise<{ success: boolean; stage: string; message: string }> =>
    apiFetch<{ success: boolean; stage: string; message: string }>(
      `/api/v1/organizations/${orgId}/recruitment/applications/${application_id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    ),

  moveStage: (
    orgId: string,
    application_id: string,
    data: { target_stage: string; reason?: string; expected_version?: number }
  ): Promise<{ success: boolean; stage: string; version: number; message: string }> =>
    apiFetch<{ success: boolean; stage: string; version: number; message: string }>(
      `/api/v1/organizations/${orgId}/recruitment/applications/${application_id}/move-stage`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

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

  getApplicationResume: (
    orgId: string,
    application_id: string
  ): Promise<UserResume> =>
    apiFetch<UserResume>(`/api/v1/organizations/${orgId}/recruitment/applications/${application_id}/resume`),

  parseQuestionFile: async (
    orgId: string,
    file: File
  ): Promise<{
    success: boolean;
    filename: string;
    total_questions: number;
    multiple_choice_count: number;
    essay_count: number;
    total_points: number;
    questions: any[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? useAuthStore.getState().token : null;
    const res = await fetch(`${BASE_URL}/api/v1/organizations/${orgId}/recruitment/parse-question-file`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể bóc tách file câu hỏi');
    }
    return res.json();
  },
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

  submitAssessment: async (
    attemptId: string,
    answers: Record<string, unknown>,
    candidateToken: string,
    options?: {
      violations_count?: number;
      is_violation_terminated?: boolean;
      termination_reason?: string;
    }
  ): Promise<AssessmentAttempt> => {
    const res = await fetch(`${BASE_URL}/api/v1/recruitment/candidate/assessments/${attemptId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        answers,
        violations_count: options?.violations_count || 0,
        is_violation_terminated: options?.is_violation_terminated || false,
        termination_reason: options?.termination_reason,
      }),
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

// ---------------------------------------------------------------------------
// Candidate Discovery, AI CV Reviewer & Personal Application Portal
// ---------------------------------------------------------------------------
export interface PublicJobOpening {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_logo_url?: string | null;
  organization_banner_url?: string | null;
  organization_tagline?: string | null;
  organization_description?: string | null;
  organization_website?: string | null;
  organization_size?: string | null;
  organization_headquarters?: string | null;
  organization_industry?: string | null;
  department_id: string;
  department_name: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  salary_range?: string | null;
  level?: string | null;
  work_type?: string | null;
  location?: string | null;
  benefits?: string | null;
  requires_assessment: boolean;
  created_at: string;
}

export interface CandidateApplication {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_logo_url?: string | null;
  opening_id: string;
  opening_title: string;
  department_name?: string | null;
  stage: RecruitmentStage;
  requires_assessment: boolean;
  created_at: string;
  updated_at: string;
  assessment_status?: string | null;
  assessment_score?: number | null;
  assessment_attempt_id?: string | null;
  interview_session_id?: string | null;
  interview_meeting_id?: string | null;
  interview_scheduled_at?: string | null;
  interview_status?: string | null;
  hr_decision?: string | null;
  owner_decision?: string | null;
  resume_id?: string | null;
  cv_url?: string | null;
  cv_text?: string | null;
  ai_score?: number | null;
}

export interface CVKeywordMatch {
  keyword: string;
  found: boolean;
  category: 'TECHNICAL' | 'SOFT_SKILL' | 'METRIC' | 'DOMAIN';
}

export interface CVReviewResult {
  overall_score: number;
  ats_score: number;
  metrics_score: number;
  structure_score: number;
  target_role?: string | null;
  summary_evaluation: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  keyword_matches: CVKeywordMatch[];
  formatting_tips: string[];
}

export interface UserResume {
  id: string;
  user_id: string;
  title: string;
  template_id: string;
  cv_data_json: string;
  is_primary: boolean;
  ats_score?: number | null;
  file_url?: string | null;
  file_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserResumeCreate {
  title: string;
  template_id?: string;
  cv_data_json: string;
  is_primary?: boolean;
  ats_score?: number | null;
  file_url?: string | null;
  file_type?: string | null;
}

export interface UserResumeUpdate {
  title?: string;
  template_id?: string;
  cv_data_json?: string;
  is_primary?: boolean;
  ats_score?: number | null;
  file_url?: string | null;
  file_type?: string | null;
}

export const candidatePortalApi = {
  getPublicOpenings: async (params?: {
    q?: string;
    department_id?: string;
    organization_id?: string;
  }): Promise<PublicJobOpening[]> => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.department_id) query.append('department_id', params.department_id);
    if (params?.organization_id) query.append('organization_id', params.organization_id);
    const qs = query.toString();
    return apiFetch<PublicJobOpening[]>(`/api/v1/recruitment/public/openings${qs ? `?${qs}` : ''}`);
  },

  applyToJob: async (
    openingId: string,
    payload: {
      cv_url?: string;
      cv_text?: string;
      cover_letter?: string;
      phone?: string;
      resume_id?: string;
    }
  ): Promise<CandidateApplication> => {
    return apiFetch<CandidateApplication>(`/api/v1/recruitment/public/openings/${openingId}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyApplications: async (): Promise<CandidateApplication[]> => {
    return apiFetch<CandidateApplication[]>('/api/v1/recruitment/candidate/my-applications');
  },

  reviewCV: async (payload: { cv_text: string; target_role?: string }): Promise<CVReviewResult> => {
    return apiFetch<CVReviewResult>('/api/v1/recruitment/candidate/cv-review', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  magicWrite: async (payload: {
    text: string;
    action_type?: 'professional' | 'metrics' | 'concise' | 'grammar';
  }): Promise<{ action_type: string; original_text: string; generated_options: string[] }> => {
    return apiFetch<{ action_type: string; original_text: string; generated_options: string[] }>(
      '/api/v1/recruitment/candidate/magic-write',
      {
        method: 'POST',
        body: JSON.stringify({
          text: payload.text,
          action_type: payload.action_type || 'professional',
        }),
      }
    );
  },

  getCandidateAssessment: async (applicationId: string): Promise<AssessmentAttempt> => {
    return apiFetch<AssessmentAttempt>(`/api/v1/recruitment/applications/${applicationId}/candidate-assessment`);
  },

  submitCandidateAssessment: async (
    applicationId: string,
    answersJson: string
  ): Promise<AssessmentAttempt> => {
    return apiFetch<AssessmentAttempt>(`/api/v1/recruitment/applications/${applicationId}/candidate-assessment/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers_json: answersJson }),
    });
  },

  // Saved Resumes & Personal CV Vault
  getSavedResumes: async (): Promise<UserResume[]> => {
    return apiFetch<UserResume[]>('/api/v1/recruitment/candidate/resumes');
  },

  getSavedResume: async (id: string): Promise<UserResume> => {
    return apiFetch<UserResume>(`/api/v1/recruitment/candidate/resumes/${id}`);
  },

  saveResume: async (payload: UserResumeCreate): Promise<UserResume> => {
    return apiFetch<UserResume>('/api/v1/recruitment/candidate/resumes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateResume: async (id: string, payload: UserResumeUpdate): Promise<UserResume> => {
    return apiFetch<UserResume>(`/api/v1/recruitment/candidate/resumes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteResume: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiFetch<{ success: boolean; message: string }>(`/api/v1/recruitment/candidate/resumes/${id}`, {
      method: 'DELETE',
    });
  },

  setPrimaryResume: async (id: string): Promise<UserResume> => {
    return apiFetch<UserResume>(`/api/v1/recruitment/candidate/resumes/${id}/set-primary`, {
      method: 'POST',
    });
  },

  assistantChat: async (payload: {
    message: string;
    history?: { role: string; content: string }[];
  }): Promise<{ reply: string }> => {
    return apiFetch<{ reply: string }>('/api/v1/recruitment/public/assistant-chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ── Public Careers API (No authentication required) ───────────────
export interface PublicJobOpeningItem {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_logo_url?: string | null;
  department_id: string;
  department_name?: string | null;
  department_description?: string | null;
  department_icon?: string | null;
  title: string;
  description?: string | null;
  requirements?: string | null;
  salary_range?: string | null;
  level?: string | null;
  work_type?: string | null;
  location?: string | null;
  benefits?: string | null;
  requires_assessment: boolean;
  created_at: string;
}

export interface PublicDepartmentItem {
  id: string;
  name: string;
  description?: string | null;
  icon: string;
}

export interface PublicCandidateApplyRequest {
  opening_id: string;
  full_name: string;
  email: string;
  phone?: string;
  current_title?: string;
  years_of_experience?: string;
  education_level?: string;
  location?: string;
  expected_salary?: string;
  earliest_start_date?: string;
  skills?: string[];
  cv_text?: string;
  cv_url?: string;
  cover_letter?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_url?: string;
}

export interface PublicCandidateApplyResponse {
  success: boolean;
  application_id: string;
  tracking_code: string;
  access_token: string;
  stage: string;
  requires_assessment: boolean;
  message: string;
}

export interface PublicTrackResponse {
  application_id: string;
  tracking_code: string;
  stage: string;
  opening_id: string;
  opening_title: string;
  department_name?: string | null;
  organization_name: string;
  organization_logo_url?: string | null;
  applied_at: string;
  requires_assessment: boolean;
  assessment_status?: string | null;
  assessment_score?: number | null;
  access_token?: string | null;
  interview_scheduled_at?: string | null;
  interview_meeting_id?: string | null;
  interview_status?: string | null;
  status_description: string;
}

export const publicCareersApi = {
  getOpenings: async (params?: {
    department_id?: string;
    level?: string;
    search?: string;
  }): Promise<PublicJobOpeningItem[]> => {
    const q = new URLSearchParams();
    if (params?.department_id) q.set('department_id', params.department_id);
    if (params?.level) q.set('level', params.level);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<PublicJobOpeningItem[]>(`/api/v1/public/careers/openings${qs}`);
  },

  getDepartments: async (): Promise<PublicDepartmentItem[]> => {
    return apiFetch<PublicDepartmentItem[]>('/api/v1/public/careers/departments');
  },

  apply: async (payload: PublicCandidateApplyRequest): Promise<PublicCandidateApplyResponse> => {
    return apiFetch<PublicCandidateApplyResponse>('/api/v1/public/careers/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadCV: async (file: File): Promise<{
    success: boolean;
    filename: string;
    unique_filename: string;
    file_url: string;
    file_size: number;
    formatted_size: string;
    content_type: string;
    data_url?: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    const res = await fetch(`${apiUrl}/api/v1/public/careers/upload-cv`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Tải tệp CV thất bại' }));
      throw new Error(err.detail || err.message || 'Lỗi khi tải lên file CV');
    }
    return res.json();
  },

  track: async (email: string, trackingCode: string): Promise<PublicTrackResponse> => {
    return apiFetch<PublicTrackResponse>('/api/v1/public/careers/track', {
      method: 'POST',
      body: JSON.stringify({ email, tracking_code: trackingCode }),
    });
  },

  getAssessment: async (token: string): Promise<any> => {
    return apiFetch<any>(`/api/v1/public/careers/assessment/${token}`);
  },

  submitAssessment: async (
    token: string,
    payload: {
      answers?: Record<string, any>;
      answers_json?: string;
      violations_count?: number;
      is_violation_terminated?: boolean;
      termination_reason?: string;
    }
  ): Promise<any> => {
    return apiFetch<any>(`/api/v1/public/careers/assessment/${token}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
