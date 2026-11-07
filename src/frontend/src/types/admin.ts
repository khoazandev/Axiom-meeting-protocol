export interface DepartmentNode {
  id: string;
  name: string;
  code?: string;
  description?: string;
  managerName?: string | null;
  managerEmail?: string | null;
  managerAvatar?: string | null;
  memberCount: number;
  activeMeetingsCount?: number;
  color?: string;
}

export interface ProtocolPolicySettings {
  enforceAgendaGate: boolean;
  minAgendaLength: number;
  autoExtractMom: boolean;
  requireTaskAssignee: boolean;
  recordingStorageRetentionDays: number;
  requireCameraAttendance: boolean;
  allowGuestJoining: boolean;
  sttLanguagePriority: 'vi' | 'en' | 'multilingual';
}
