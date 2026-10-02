import { redirect } from 'next/navigation';

export default function CandidateDashboardPage() {
  redirect('/candidate/discovery?tab=applications');
}
