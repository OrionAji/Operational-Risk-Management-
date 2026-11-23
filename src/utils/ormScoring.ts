import { ORM_CHECKLIST_ITEMS } from '../data/ormChecklist';
import type {
  CommandRole,
  OrmBreakdownEntry,
  OrmEvaluationResult,
  OrmSectionId,
  OrmSelectionMap,
  OrmStatus,
  OrmSubmission,
  RiskLevel,
  RiskTierMetadata,
  UserRoleProfile,
} from '../types/orm';

export const ROLE_HIERARCHY: Record<CommandRole, number> = {
  Pilot: 0,
  CO: 1,
  GOO: 2,
  Comd: 3,
};

export const ROLE_FULL_LABELS: Record<CommandRole, string> = {
  Pilot: 'Pilot Flying',
  CO: 'CO (Commanding Officer)',
  GOO: 'GOO (Group Operations Officer)',
  Comd: 'Comd (Commander)',
};

export const RISK_TIER_CONFIG: Record<RiskLevel, RiskTierMetadata> = {
  LOW: {
    level: 'LOW',
    label: 'LOW RISK',
    shortLabel: 'Low',
    colorHex: '#2E7D32',
    bgTintClass: 'bg-[#2E7D32]/10',
    textColorClass: 'text-[#2E7D32]',
    borderColorClass: 'border-[#2E7D32]/30',
    rangeLabel: '0–5 Pts',
    defaultMda: 'Pilot',
    mdaDisplayName: 'Pilot Flying (Auto-Cleared)',
    iconName: 'check',
  },
  MODERATE: {
    level: 'MODERATE',
    label: 'MODERATE RISK',
    shortLabel: 'Moderate',
    colorHex: '#F57F17',
    bgTintClass: 'bg-[#F57F17]/12',
    textColorClass: 'text-[#B45309]',
    borderColorClass: 'border-[#F57F17]/40',
    rangeLabel: '6–12 Pts',
    defaultMda: 'CO',
    mdaDisplayName: 'CO (Commanding Officer)',
    iconName: 'caution',
  },
  HIGH: {
    level: 'HIGH',
    label: 'HIGH RISK',
    shortLabel: 'High',
    colorHex: '#E65100',
    bgTintClass: 'bg-[#E65100]/12',
    textColorClass: 'text-[#C2410C]',
    borderColorClass: 'border-[#E65100]/40',
    rangeLabel: '13–15 Pts',
    defaultMda: 'GOO',
    mdaDisplayName: 'GOO (Group Operations Officer)',
    iconName: 'alert',
  },
  SEVERE: {
    level: 'SEVERE',
    label: 'SEVERE RISK',
    shortLabel: 'Severe',
    colorHex: '#C62828',
    bgTintClass: 'bg-[#C62828]/12',
    textColorClass: 'text-[#C62828]',
    borderColorClass: 'border-[#C62828]/40',
    rangeLabel: '16+ Pts',
    defaultMda: 'Comd',
    mdaDisplayName: 'Comd (Commander)',
    iconName: 'hazard',
  },
};

export function getDefaultSelections(): OrmSelectionMap {
  const map: OrmSelectionMap = {};
  for (const item of ORM_CHECKLIST_ITEMS) {
    const firstOption = item.options[0];
    map[item.id] = {
      optionId: firstOption.id,
      points: firstOption.points,
    };
  }
  return map;
}

export function classifyRiskLevel(totalScore: number): RiskLevel {
  if (totalScore <= 5) return 'LOW';
  if (totalScore <= 12) return 'MODERATE';
  if (totalScore <= 15) return 'HIGH';
  return 'SEVERE';
}

export function getBaseMdaForScore(totalScore: number): CommandRole {
  if (totalScore <= 5) return 'Pilot';
  if (totalScore <= 12) return 'CO';
  if (totalScore <= 15) return 'GOO';
  return 'Comd';
}

/**
 * Anti-Self-Approval Rule:
 * If the submitting pilot holds (or outranks) the required MDA role on an elevated-risk
 * sortie (>= 6 pts), automatically escalate approval to the next higher authority
 * (CO -> GOO -> Comd) so no pilot approves their own elevated-risk mission.
 */
export function resolveRequiredMda(
  totalScore: number,
  pilotRole: CommandRole
): { baseMdaRole: CommandRole; requiredMdaRole: CommandRole; escalated: boolean; escalationReason: string | null } {
  const baseMdaRole = getBaseMdaForScore(totalScore);
  if (totalScore <= 5) {
    return {
      baseMdaRole: 'Pilot',
      requiredMdaRole: 'Pilot',
      escalated: false,
      escalationReason: null,
    };
  }

  // Score 6-12: base CO
  if (baseMdaRole === 'CO') {
    if (pilotRole === 'CO') {
      return {
        baseMdaRole,
        requiredMdaRole: 'GOO',
        escalated: true,
        escalationReason: 'Anti-Self-Approval: CO submission auto-escalated to GOO',
      };
    }
    if (pilotRole === 'GOO') {
      return {
        baseMdaRole,
        requiredMdaRole: 'Comd',
        escalated: true,
        escalationReason: 'Anti-Self-Approval: GOO submission auto-escalated to Comd',
      };
    }
    if (pilotRole === 'Comd') {
      return {
        baseMdaRole,
        requiredMdaRole: 'Comd',
        escalated: true,
        escalationReason: 'Commander Authority: Routed to Comd for mission sign-off',
      };
    }
    return { baseMdaRole, requiredMdaRole: 'CO', escalated: false, escalationReason: null };
  }

  // Score 13-15: base GOO
  if (baseMdaRole === 'GOO') {
    if (pilotRole === 'GOO') {
      return {
        baseMdaRole,
        requiredMdaRole: 'Comd',
        escalated: true,
        escalationReason: 'Anti-Self-Approval: GOO submission auto-escalated to Comd',
      };
    }
    if (pilotRole === 'Comd') {
      return {
        baseMdaRole,
        requiredMdaRole: 'Comd',
        escalated: true,
        escalationReason: 'Commander Authority: Routed to Comd for mission sign-off',
      };
    }
    return { baseMdaRole, requiredMdaRole: 'GOO', escalated: false, escalationReason: null };
  }

  // Score 16+: base Comd (Commander is authorized to sign off on all missions including their own)
  return {
    baseMdaRole: 'Comd',
    requiredMdaRole: 'Comd',
    escalated: false,
    escalationReason: null,
  };
}

export function getInitialOrmStatus(requiredMdaRole: CommandRole): OrmStatus {
  switch (requiredMdaRole) {
    case 'Pilot':
      return 'CLEARED';
    case 'CO':
      return 'PENDING CO SIGN-OFF';
    case 'GOO':
      return 'PENDING GOO SIGN-OFF';
    case 'Comd':
      return 'PENDING COMD SIGN-OFF';
  }
}

export function evaluateOrmChecklist(
  selections: OrmSelectionMap,
  pilotRole: CommandRole
): OrmEvaluationResult {
  const sectionScores: Record<OrmSectionId, number> = { A: 0, B: 0, C: 0 };
  const itemizedBreakdown: OrmBreakdownEntry[] = [];
  let totalScore = 0;

  for (const item of ORM_CHECKLIST_ITEMS) {
    const sel = selections[item.id];
    const matchedOption =
      item.options.find((opt) => opt.id === sel?.optionId) ?? item.options[0];

    let points = matchedOption.points;
    if (matchedOption.variableScores && sel) {
      points = matchedOption.variableScores.includes(sel.points)
        ? sel.points
        : matchedOption.variableScores[0];
    }

    totalScore += points;
    sectionScores[item.section] += points;

    const choiceLabel = matchedOption.variableScores
      ? `${matchedOption.label} (${points} pt${points === 1 ? '' : 's'})`
      : matchedOption.label;

    itemizedBreakdown.push({
      itemNumber: item.number,
      section: item.section,
      itemId: item.id,
      title: item.title,
      choiceLabel,
      points,
    });
  }

  const riskLevel = classifyRiskLevel(totalScore);
  const riskMeta = RISK_TIER_CONFIG[riskLevel];
  const { baseMdaRole, requiredMdaRole, escalated, escalationReason } = resolveRequiredMda(
    totalScore,
    pilotRole
  );
  const initialStatus = getInitialOrmStatus(requiredMdaRole);

  const topRiskDrivers = [...itemizedBreakdown]
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points || a.itemNumber - b.itemNumber)
    .slice(0, 3)
    .map((entry) => `${entry.title}: ${entry.choiceLabel} (+${entry.points})`);

  return {
    totalScore,
    riskLevel,
    riskMeta,
    baseMdaRole,
    requiredMdaRole,
    escalated,
    escalationReason,
    initialStatus,
    itemizedBreakdown,
    topRiskDrivers,
    requiresMitigation: totalScore >= 6,
    sectionScores,
  };
}

export function isPendingOrmStatus(status: OrmStatus): boolean {
  return (
    status === 'PENDING CO SIGN-OFF' ||
    status === 'PENDING GOO SIGN-OFF' ||
    status === 'PENDING COMD SIGN-OFF'
  );
}

export function canUserApproveOrm(
  user: UserRoleProfile | null,
  orm: Pick<OrmSubmission, 'pilotId' | 'requiredMdaRole' | 'status'>
): { allowed: boolean; reason?: string } {
  if (!user || user.status !== 'Verified') {
    return { allowed: false, reason: 'Account must be verified to sign off missions.' };
  }
  if (!isPendingOrmStatus(orm.status)) {
    return { allowed: false, reason: 'This ORM has already reached a final status.' };
  }
  if (orm.pilotId === user.uid && user.commandRole !== 'Comd') {
    return {
      allowed: false,
      reason: 'Anti-Self-Approval Rule: You cannot approve or reject your own elevated-risk mission.',
    };
  }
  if (ROLE_HIERARCHY[user.commandRole] < ROLE_HIERARCHY[orm.requiredMdaRole]) {
    return {
      allowed: false,
      reason: `Requires ${ROLE_FULL_LABELS[orm.requiredMdaRole]} authority or higher.`,
    };
  }
  return { allowed: true };
}

export interface OrmFormHeaderInput {
  pilotName: string;
  rankCallsign: string;
  sortieDate: string;
  aircraftTail: string;
  missionCallsign: string;
  mitigationNotes: string;
}

export function validateOrmHeaderAndMitigation(
  input: OrmFormHeaderInput,
  totalScore: number
): string[] {
  const errors: string[] = [];
  if (!input.pilotName.trim() || input.pilotName.trim().length > 100) {
    errors.push('Pilot Name is required (max 100 characters).');
  }
  if (!input.rankCallsign.trim() || input.rankCallsign.trim().length > 60) {
    errors.push('Rank / Callsign is required (max 60 characters).');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sortieDate.trim())) {
    errors.push('Sortie Date must be a valid YYYY-MM-DD date.');
  }
  if (!input.aircraftTail.trim() || input.aircraftTail.trim().length > 40) {
    errors.push('Aircraft / Tail Number is required (max 40 characters).');
  }
  if (!input.missionCallsign.trim() || input.missionCallsign.trim().length > 40) {
    errors.push('Mission Callsign is required (max 40 characters).');
  }
  if (totalScore >= 6 && !input.mitigationNotes.trim()) {
    errors.push('Mitigation Notes / Remarks are required for any ORM scoring 6 or higher.');
  }
  if (input.mitigationNotes.trim().length > 2000) {
    errors.push('Mitigation Notes must be 2,000 characters or fewer.');
  }
  return errors;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
