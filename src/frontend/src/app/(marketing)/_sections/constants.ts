import { FileText, Video, Cpu, Shield, Lock, Server, Globe } from 'lucide-react';

/* ─── Trusted By Companies ─────────────────────────────── */
export const TRUSTED_BY = [
  'Viettel Solutions',
  'FPT Software',
  'VNG Corporation',
  'CMC Global',
  'TMA Solutions',
  'KMS Technology',
];

/* ─── How It Works Steps ──────────────────────────────── */
export const STEPS = [
  {
    title: 'Define Agenda',
    description:
      'Enforce structured meeting discipline. Every meeting requires a detailed agenda validated by the Process Gate before creation.',
    icon: FileText,
  },
  {
    title: 'Join Conference',
    description:
      'Browser-based WebRTC video conferencing powered by LiveKit. No downloads, no external dependencies. 100% on-premise.',
    icon: Video,
  },
  {
    title: 'Capture Intelligence',
    description:
      'Local Whisper transcription and Llama-3 summarization extract decisions, action items, and insights automatically.',
    icon: Cpu,
  },
];

/* ─── Security Section Items ──────────────────────────── */
export const SECURITY_ITEMS = [
  'Self-hosted WebRTC via LiveKit - no external relay',
  'Local Whisper & Llama models - zero cloud API calls',
  'SQLite/PostgreSQL on your own servers',
  'Fully air-gapped deployment supported',
];

export const SECURITY_BADGES = [
  { icon: Shield, title: 'On-Premise', desc: 'Deploy in your VPC' },
  { icon: Lock, title: 'Encrypted', desc: 'End-to-end security' },
  { icon: Server, title: 'Self-Hosted', desc: 'No vendor lock-in' },
  { icon: Globe, title: 'Air-Gapped', desc: 'Offline capable' },
];
