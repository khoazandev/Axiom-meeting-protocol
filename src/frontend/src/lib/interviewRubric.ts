/**
 * Interview Evaluation Rubric & Dialogue Scoring Specification (Frontend).
 * Đặc tả thang điểm đánh giá kịch bản đối thoại phỏng vấn ứng viên.
 */

import { getAuthHeaders } from './api';

export interface PillarScore {
  pillar_key: string;
  pillar_name: string;
  weight_percent: number;
  max_score: number;
  earned_score: number;
  confidence: number;
  strengths: string[];
  improvements: string[];
}

export interface DialogueTurnAnalysis {
  question_index: number;
  interviewer_question: string;
  candidate_answer: string;
  response_latency_seconds: number;
  speaking_duration_seconds: number;
  words_per_minute: number;
  filler_word_count: number;
  is_accurate: boolean;
  accuracy_percent: number;
  star_method_used: boolean;
  latency_evaluation: 'FAST_CONFIDENT' | 'OPTIMAL' | 'HESITANT' | string;
  feedback_notes: string;
}

export interface InterviewScorecard {
  session_id: string;
  application_id?: string | null;
  candidate_name: string;
  job_title: string;
  overall_score: number;
  gpa_scale_5: number;
  grade: 'GRADE_S' | 'GRADE_A' | 'GRADE_B' | 'GRADE_C' | 'GRADE_D' | string;
  recommendation: 'RECOMMENDED_HIRE' | 'CONSIDER' | 'NO_HIRE' | string;
  pillars: PillarScore[];
  dialogue_turns: DialogueTurnAnalysis[];
  executive_summary: string;
  avg_latency_seconds: number;
  avg_accuracy_percent: number;
  archive_status: 'READY_TO_ARCHIVE' | 'ARCHIVED' | 'CONFIRMED' | string;
}

export const interviewEvaluationApi = {
  getByMeeting: async (
    orgId: string,
    meetingId: string
  ): Promise<{ id: string; meeting_id: string; application_id: string; status: string }> => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/v1/organizations/${orgId}/interviews/by-meeting/${meetingId}`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không tìm thấy phiên phỏng vấn cho cuộc họp này');
    }
    return res.json();
  },

  getScorecard: async (orgId: string, interviewId: string): Promise<InterviewScorecard> => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/v1/organizations/${orgId}/interviews/${interviewId}/scorecard`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể lấy thang điểm đánh giá phỏng vấn');
    }
    return res.json();
  },

  confirmArchive: async (
    orgId: string,
    interviewId: string
  ): Promise<{ success: boolean; meeting_id: string; message: string }> => {
    const headers = getAuthHeaders();
    const res = await fetch(
      `/api/v1/organizations/${orgId}/interviews/${interviewId}/archive-confirm`,
      {
        method: 'POST',
        headers,
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể lưu trữ phỏng vấn vào kho tài liệu');
    }
    return res.json();
  },
};
