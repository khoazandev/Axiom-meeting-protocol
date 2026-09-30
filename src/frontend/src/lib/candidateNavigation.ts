export type CandidateTab = 'cv' | 'jobs' | 'applications';

export function resolveCandidateTab(tab: string | null): CandidateTab {
  return tab === 'jobs' || tab === 'applications' ? tab : 'cv';
}
