import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RecruitmentApplication } from '@/lib/recruitment-api';

export interface CandidateSessionState {
  token: string | null;
  applicationId: string | null;
  candidateId: string | null;
  expiresAt: string | null;
  application: RecruitmentApplication | null;
  setCandidateSession: (session: {
    token: string;
    applicationId: string;
    candidateId: string;
    expiresIn?: number;
  }) => void;
  setApplication: (application: RecruitmentApplication | null) => void;
  clearCandidateSession: () => void;
}

export const useCandidateStore = create<CandidateSessionState>()(
  persist(
    (set) => ({
      token: null,
      applicationId: null,
      candidateId: null,
      expiresAt: null,
      application: null,
      setCandidateSession: ({ token, applicationId, candidateId, expiresIn }) => {
        const expiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null;
        set({ token, applicationId, candidateId, expiresAt });
      },
      setApplication: (application) => set({ application }),
      clearCandidateSession: () =>
        set({
          token: null,
          applicationId: null,
          candidateId: null,
          expiresAt: null,
          application: null,
        }),
    }),
    {
      name: 'axiom-candidate-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
