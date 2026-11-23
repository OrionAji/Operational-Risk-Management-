import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserApproveOrm,
  classifyRiskLevel,
  evaluateOrmChecklist,
  getDefaultSelections,
  resolveRequiredMda,
  RISK_TIER_CONFIG,
  validateOrmHeaderAndMitigation,
} from './ormScoring';
import { ORM_CHECKLIST_ITEMS } from '../data/ormChecklist';
import type { UserRoleProfile } from '../types/orm';

test('checklist contains all 16 required ORM items across Sections A, B, and C', () => {
  assert.equal(ORM_CHECKLIST_ITEMS.length, 16);
  const secA = ORM_CHECKLIST_ITEMS.filter((i) => i.section === 'A');
  const secB = ORM_CHECKLIST_ITEMS.filter((i) => i.section === 'B');
  const secC = ORM_CHECKLIST_ITEMS.filter((i) => i.section === 'C');
  assert.equal(secA.length, 8);
  assert.equal(secB.length, 4);
  assert.equal(secC.length, 4);
});

test('baseline selections score 0 (LOW RISK, #2E7D32, auto-CLEARED)', () => {
  const evalResult = evaluateOrmChecklist(getDefaultSelections(), 'Pilot');
  assert.equal(evalResult.totalScore, 0);
  assert.equal(evalResult.riskLevel, 'LOW');
  assert.equal(evalResult.riskMeta.colorHex, '#2E7D32');
  assert.equal(evalResult.requiredMdaRole, 'Pilot');
  assert.equal(evalResult.initialStatus, 'CLEARED');
  assert.equal(evalResult.requiresMitigation, false);
  assert.equal(evalResult.topRiskDrivers.length, 0);
});

test('four-tier risk boundaries map strictly to exact colors and statuses', () => {
  assert.equal(classifyRiskLevel(5), 'LOW');
  assert.equal(RISK_TIER_CONFIG.LOW.colorHex, '#2E7D32');

  assert.equal(classifyRiskLevel(6), 'MODERATE');
  assert.equal(classifyRiskLevel(12), 'MODERATE');
  assert.equal(RISK_TIER_CONFIG.MODERATE.colorHex, '#F57F17');

  assert.equal(classifyRiskLevel(13), 'HIGH');
  assert.equal(classifyRiskLevel(15), 'HIGH');
  assert.equal(RISK_TIER_CONFIG.HIGH.colorHex, '#E65100');

  assert.equal(classifyRiskLevel(16), 'SEVERE');
  assert.equal(classifyRiskLevel(34), 'SEVERE');
  assert.equal(RISK_TIER_CONFIG.SEVERE.colorHex, '#C62828');
});

test('variable exact-score pickers (Sleep Cycle 1-3, Personal Stress 1-4, Evaluation 3-6) calculate accurately', () => {
  const selections = getDefaultSelections();
  selections.sleep_cycle = { optionId: 'rested', points: 3 };
  selections.personal_stress = { optionId: 'medium', points: 4 };
  selections.sortie_type = { optionId: 'evaluation', points: 6 };

  const result = evaluateOrmChecklist(selections, 'Pilot');
  assert.equal(result.totalScore, 13);
  assert.equal(result.sectionScores.A, 7);
  assert.equal(result.sectionScores.B, 6);
  assert.equal(result.sectionScores.C, 0);
  assert.equal(result.riskLevel, 'HIGH');
  assert.equal(result.requiredMdaRole, 'GOO');
  assert.equal(result.initialStatus, 'PENDING GOO SIGN-OFF');
  assert.equal(result.requiresMitigation, true);
  assert.equal(result.topRiskDrivers.length, 3);
  assert.match(result.topRiskDrivers[0], /Sortie Type: Evaluation \(6 pts\) \(\+6\)/);
});

test('Anti-Self-Approval Rule escalates CO -> GOO -> Comd on elevated risk submissions', () => {
  // CO submits 9-pt Moderate Risk -> escalates CO -> GOO
  const coMod = resolveRequiredMda(9, 'CO');
  assert.equal(coMod.baseMdaRole, 'CO');
  assert.equal(coMod.requiredMdaRole, 'GOO');
  assert.equal(coMod.escalated, true);

  // GOO submits 14-pt High Risk -> escalates GOO -> Comd
  const gooHigh = resolveRequiredMda(14, 'GOO');
  assert.equal(gooHigh.baseMdaRole, 'GOO');
  assert.equal(gooHigh.requiredMdaRole, 'Comd');
  assert.equal(gooHigh.escalated, true);

  // Pilot submits 9-pt Moderate Risk -> stays CO (no escalation)
  const pilotMod = resolveRequiredMda(9, 'Pilot');
  assert.equal(pilotMod.requiredMdaRole, 'CO');
  assert.equal(pilotMod.escalated, false);

  // CO submits 4-pt Low Risk -> remains Pilot auto-cleared
  const coLow = resolveRequiredMda(4, 'CO');
  assert.equal(coLow.requiredMdaRole, 'Pilot');
  assert.equal(coLow.escalated, false);
});

test('canUserApproveOrm enforces anti-self-approval, authority level, and terminal locks', () => {
  const coUser: UserRoleProfile = {
    uid: 'uid_co',
    displayName: 'Maj Vance',
    rankCallsign: 'Maj / HAWK',
    commandRole: 'CO',
    status: 'Verified',
    isAdmin: false,
    createdAt: '',
    updatedAt: '',
  };
  const gooUser: UserRoleProfile = { ...coUser, uid: 'uid_goo', commandRole: 'GOO' };
  const comdUser: UserRoleProfile = { ...coUser, uid: 'uid_comd', commandRole: 'Comd' };

  // CO cannot approve own submission
  assert.equal(
    canUserApproveOrm(coUser, { pilotId: 'uid_co', requiredMdaRole: 'CO', status: 'PENDING CO SIGN-OFF' }).allowed,
    false
  );
  // GOO cannot approve own submission
  assert.equal(
    canUserApproveOrm(gooUser, { pilotId: 'uid_goo', requiredMdaRole: 'GOO', status: 'PENDING GOO SIGN-OFF' }).allowed,
    false
  );
  // CO cannot approve GOO-level submission
  assert.equal(
    canUserApproveOrm(coUser, { pilotId: 'uid_p1', requiredMdaRole: 'GOO', status: 'PENDING GOO SIGN-OFF' }).allowed,
    false
  );
  // GOO can approve CO's escalated 9-pt mission
  assert.equal(
    canUserApproveOrm(gooUser, { pilotId: 'uid_co', requiredMdaRole: 'GOO', status: 'PENDING GOO SIGN-OFF' }).allowed,
    true
  );
  // Comd can approve all pending missions (CO, GOO, Comd) INCLUDING their own
  assert.equal(
    canUserApproveOrm(comdUser, { pilotId: 'uid_p1', requiredMdaRole: 'CO', status: 'PENDING CO SIGN-OFF' }).allowed,
    true
  );
  assert.equal(
    canUserApproveOrm(comdUser, { pilotId: 'uid_co', requiredMdaRole: 'GOO', status: 'PENDING GOO SIGN-OFF' }).allowed,
    true
  );
  assert.equal(
    canUserApproveOrm(comdUser, { pilotId: 'uid_comd', requiredMdaRole: 'Comd', status: 'PENDING COMD SIGN-OFF' }).allowed,
    true
  );
  // Cannot re-decide an already APPROVED mission
  assert.equal(
    canUserApproveOrm(comdUser, { pilotId: 'uid_comd', requiredMdaRole: 'Comd', status: 'APPROVED' }).allowed,
    false
  );
});

test('form validation enforces mandatory header fields and mitigation notes when score >= 6', () => {
  const baseHeader = {
    pilotName: 'Capt Reyes',
    rankCallsign: 'Capt / VIPER',
    sortieDate: '2026-11-22',
    aircraftTail: 'C-130J #4071',
    missionCallsign: 'ATLAS 41',
    mitigationNotes: '',
  };
  // Score 4 -> valid without mitigation notes
  assert.equal(validateOrmHeaderAndMitigation(baseHeader, 4).length, 0);
  // Score 6 -> requires mitigation notes
  const errsAt6 = validateOrmHeaderAndMitigation(baseHeader, 6);
  assert.equal(errsAt6.length, 1);
  assert.match(errsAt6[0], /Mitigation Notes/);
  // Score 6 with mitigation notes -> valid
  assert.equal(
    validateOrmHeaderAndMitigation({ ...baseHeader, mitigationNotes: 'Briefed fatigue mitigations with crew.' }, 6)
      .length,
    0
  );
});
