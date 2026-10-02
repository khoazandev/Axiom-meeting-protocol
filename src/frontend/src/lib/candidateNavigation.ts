export type CandidateTab = 'jobs' | 'cv' | 'vault' | 'applications';

export function resolveCandidateTab(tab: string | null): CandidateTab {
  if (tab === 'jobs' || tab === 'cv' || tab === 'vault' || tab === 'applications') {
    return tab;
  }
  return 'jobs';
}
