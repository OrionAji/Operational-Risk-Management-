export type CommandRole = 'Pilot' | 'CO' | 'GOO' | 'Comd';

export type AccountStatus = 'Pending' | 'Verified' | 'Suspended';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export type OrmStatus =
  | 'CLEARED'
  | 'PENDING CO SIGN-OFF'
  | 'PENDING GOO SIGN-OFF'
  | 'PENDING COMD SIGN-OFF'
  | 'APPROVED'
  | 'REJECTED';

export type OrmSectionId = 'A' | 'B' | 'C';

export interface OrmItemOption {
  id: string;
  label: string;
  points: number;
  variableScores?: number[];
}

export interface OrmChecklistItem {
  id: string;
  number: number;
  section: OrmSectionId;
  title: string;
  subtitle?: string;
  options: OrmItemOption[];
}

export interface OrmItemSelection {
  optionId: string;
  points: number;
}

export type OrmSelectionMap = Record<string, OrmItemSelection>;

export interface OrmBreakdownEntry {
  itemNumber: number;
  section: OrmSectionId;
  itemId: string;
  title: string;
  choiceLabel: string;
  points: number;
}

export interface RiskTierMetadata {
  level: RiskLevel;
  label: string;
  shortLabel: string;
  colorHex: string;
  bgTintClass: string;
  textColorClass: string;
  borderColorClass: string;
  rangeLabel: string;
  defaultMda: CommandRole;
  mdaDisplayName: string;
  iconName: 'check' | 'caution' | 'alert' | 'hazard';
}

export interface OrmEvaluationResult {
  totalScore: number;
  riskLevel: RiskLevel;
  riskMeta: RiskTierMetadata;
  baseMdaRole: CommandRole;
  requiredMdaRole: CommandRole;
  escalated: boolean;
  escalationReason: string | null;
  initialStatus: OrmStatus;
  itemizedBreakdown: OrmBreakdownEntry[];
  topRiskDrivers: string[];
  requiresMitigation: boolean;
  sectionScores: Record<OrmSectionId, number>;
}

export interface UserRoleProfile {
  uid: string;
  displayName: string;
  rankCallsign: string;
  commandRole: CommandRole;
  status: AccountStatus;
  isAdmin: boolean;
  email?: string;
  notificationsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrmSubmission {
  id: string;
  pilotId: string;
  pilotName: string;
  rankCallsign: string;
  pilotRole: CommandRole;
  sortieDate: string;
  aircraftTail: string;
  missionCallsign: string;
  itemizedBreakdown: OrmBreakdownEntry[];
  totalScore: number;
  riskLevel: RiskLevel;
  baseMdaRole: CommandRole;
  requiredMdaRole: CommandRole;
  escalated: boolean;
  topRiskDrivers: string[];
  mitigationNotes: string;
  status: OrmStatus;
  decisionByUid: string;
  decisionByName: string;
  decisionByRole: string;
  commandRemarks: string;
  submittedAt: string;
  decidedAt?: string;
  updatedAt: string;
  hasPendingWrites?: boolean;
}

export type AuditAction =
  | 'ORM_SUBMITTED'
  | 'ORM_CLEARED_AUTO'
  | 'ORM_APPROVED'
  | 'ORM_REJECTED'
  | 'USER_VERIFIED'
  | 'USER_ROLE_UPDATED'
  | 'USER_SUSPENDED';

export interface AuditLogEntry {
  id: string;
  ormId: string;
  action: AuditAction;
  actorUid: string;
  actorName: string;
  actorRole: string;
  targetPilotId: string;
  summary: string;
  score: number;
  riskLevel: string;
  timestamp: string;
}

export interface OrmNotification {
  id: string;
  ormId: string;
  type: 'MDA_REVIEW_REQUIRED' | 'ORM_DECISION';
  recipientUid: string;
  recipientRole: CommandRole;
  senderUid: string;
  pilotName: string;
  missionCallsign: string;
  score: number;
  riskLevel: RiskLevel;
  topRiskDrivers: string[];
  title: string;
  body: string;
  readBy: string[];
  createdAt: string;
}
