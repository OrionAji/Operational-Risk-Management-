/**
 * Phase 0: Payload-First Security TDD specification for 407 ACTG ORM Firestore Rules.
 * Validates the "Dirty Dozen" attack vectors against pure rule-mirroring invariants
 * and documents exact Firestore Emulator test cases.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

type CommandRole = 'Pilot' | 'CO' | 'GOO' | 'Comd';
type AccountStatus = 'Pending' | 'Verified' | 'Suspended';

interface MockAuth {
  uid: string;
  email: string;
  emailVerified: boolean;
}

interface MockUserRole {
  uid: string;
  displayName: string;
  rankCallsign: string;
  commandRole: CommandRole;
  status: AccountStatus;
  isAdmin: boolean;
}

const BOOTSTRAP_ADMIN_EMAIL = 'ajigamaliel30@gmail.com';
const ROLE_RANK: Record<CommandRole, number> = { Pilot: 0, CO: 1, GOO: 2, Comd: 3 };

function isBootstrappedAdmin(auth: MockAuth | null): boolean {
  return !!auth && auth.emailVerified === true && auth.email === BOOTSTRAP_ADMIN_EMAIL;
}

function canCreateUserRole(
  auth: MockAuth | null,
  docId: string,
  payload: Record<string, unknown>
): boolean {
  if (!auth || !auth.emailVerified) return false;
  if (docId !== auth.uid || payload.uid !== auth.uid) return false;
  const allowed = ['uid', 'displayName', 'rankCallsign', 'commandRole', 'status', 'isAdmin', 'createdAt', 'updatedAt'];
  const keys = Object.keys(payload);
  if (!allowed.every((k) => keys.includes(k)) || keys.some((k) => !allowed.includes(k))) return false;
  if (isBootstrappedAdmin(auth)) {
    return payload.status === 'Verified' && payload.isAdmin === true;
  }
  return payload.status === 'Pending' && payload.commandRole === 'Pilot' && payload.isAdmin === false;
}

function canCreateOrm(
  auth: MockAuth | null,
  actorRole: MockUserRole | null,
  payload: Record<string, unknown>
): boolean {
  if (!auth || !auth.emailVerified) return false;
  if (!actorRole || actorRole.status !== 'Verified') return false;
  if (payload.pilotId !== auth.uid) return false;
  const totalScore = Number(payload.totalScore);
  if (!Number.isFinite(totalScore) || totalScore < 0 || totalScore > 100) return false;
  if (totalScore <= 5 && payload.status !== 'CLEARED') return false;
  if (totalScore >= 6 && payload.status === 'CLEARED') return false;
  if (totalScore >= 6 && (typeof payload.mitigationNotes !== 'string' || payload.mitigationNotes.trim().length === 0)) {
    return false;
  }
  return true;
}

function canCommandUpdateOrm(
  auth: MockAuth | null,
  actorRole: MockUserRole | null,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): boolean {
  if (!auth || !auth.emailVerified || !actorRole || actorRole.status !== 'Verified') return false;
  if (!['CO', 'GOO', 'Comd'].includes(actorRole.commandRole)) return false;
  // Terminal state lock
  if (['CLEARED', 'APPROVED', 'REJECTED'].includes(String(existing.status))) return false;
  // Anti-self-approval for CO/GOO (Comd is authorized to sign off on all missions including their own)
  if (existing.pilotId === auth.uid && actorRole.commandRole !== 'Comd') return false;
  // Authority check
  const reqRole = existing.requiredMdaRole as CommandRole;
  if (ROLE_RANK[actorRole.commandRole] < ROLE_RANK[reqRole]) return false;
  // Strict affected keys allowlist
  const allowedUpdates = new Set([
    'status',
    'decisionByUid',
    'decisionByName',
    'decisionByRole',
    'commandRemarks',
    'decidedAt',
    'updatedAt',
  ]);
  for (const key of Object.keys(incoming)) {
    if (incoming[key] !== existing[key] && !allowedUpdates.has(key)) return false;
  }
  if (!['APPROVED', 'REJECTED'].includes(String(incoming.status))) return false;
  if (incoming.decisionByUid !== auth.uid) return false;
  return true;
}

test('Dirty Dozen #1 & #2: blocks self-verification and self-role-escalation', () => {
  const newUser: MockAuth = { uid: 'u_new', email: 'pilot@407actg.mil', emailVerified: true };
  assert.equal(
    canCreateUserRole(newUser, 'u_new', {
      uid: 'u_new',
      displayName: 'Lt Rogue',
      rankCallsign: '1Lt / VIPER',
      commandRole: 'Pilot',
      status: 'Verified',
      isAdmin: false,
      createdAt: 'NOW',
      updatedAt: 'NOW',
    }),
    false
  );
  assert.equal(
    canCreateUserRole(newUser, 'u_new', {
      uid: 'u_new',
      displayName: 'Lt Rogue',
      rankCallsign: '1Lt / VIPER',
      commandRole: 'Comd',
      status: 'Pending',
      isAdmin: true,
      createdAt: 'NOW',
      updatedAt: 'NOW',
    }),
    false
  );
});

test('Dirty Dozen #3, #5, #6: blocks unverified ORM submit, spoofed pilotId, and elevated-risk auto-clear', () => {
  const pendingAuth: MockAuth = { uid: 'u_pend', email: 'p@407.mil', emailVerified: true };
  const pendingRole: MockUserRole = {
    uid: 'u_pend',
    displayName: 'Pending Pilot',
    rankCallsign: '2Lt / ROOK',
    commandRole: 'Pilot',
    status: 'Pending',
    isAdmin: false,
  };
  assert.equal(canCreateOrm(pendingAuth, pendingRole, { pilotId: 'u_pend', totalScore: 2, status: 'CLEARED' }), false);

  const verifiedRole: MockUserRole = { ...pendingRole, uid: 'u_p1', status: 'Verified' };
  const verifiedAuth: MockAuth = { uid: 'u_p1', email: 'p1@407.mil', emailVerified: true };
  // Identity spoof
  assert.equal(canCreateOrm(verifiedAuth, verifiedRole, { pilotId: 'u_other', totalScore: 2, status: 'CLEARED' }), false);
  // Score 12 auto-clear cheat
  assert.equal(
    canCreateOrm(verifiedAuth, verifiedRole, {
      pilotId: 'u_p1',
      totalScore: 12,
      status: 'CLEARED',
      mitigationNotes: 'Trying to skip CO',
    }),
    false
  );
});

test('Dirty Dozen #7, #8, #9, #10: blocks self-approval, insufficient authority, terminal mutation, and ghost fields', () => {
  const coAuth: MockAuth = { uid: 'u_co', email: 'co@407.mil', emailVerified: true };
  const coRole: MockUserRole = {
    uid: 'u_co',
    displayName: 'Maj Vance',
    rankCallsign: 'Maj / HAWK',
    commandRole: 'CO',
    status: 'Verified',
    isAdmin: false,
  };
  const basePending = {
    pilotId: 'u_co',
    totalScore: 9,
    requiredMdaRole: 'CO',
    status: 'PENDING CO SIGN-OFF',
    decisionByUid: '',
    decisionByName: '',
    decisionByRole: '',
    commandRemarks: '',
  };
  // #7 Self-approval blocked
  assert.equal(
    canCommandUpdateOrm(coAuth, coRole, basePending, {
      ...basePending,
      status: 'APPROVED',
      decisionByUid: 'u_co',
      decisionByName: 'Maj Vance',
      decisionByRole: 'CO',
      commandRemarks: 'Self approved',
      decidedAt: 'NOW',
      updatedAt: 'NOW',
    }),
    false
  );
  // #8 CO cannot approve GOO-required ORM
  const gooPending = { ...basePending, pilotId: 'u_p2', totalScore: 14, requiredMdaRole: 'GOO', status: 'PENDING GOO SIGN-OFF' };
  assert.equal(
    canCommandUpdateOrm(coAuth, coRole, gooPending, {
      ...gooPending,
      status: 'APPROVED',
      decisionByUid: 'u_co',
      decisionByName: 'Maj Vance',
      decisionByRole: 'CO',
      commandRemarks: 'Approved',
      decidedAt: 'NOW',
      updatedAt: 'NOW',
    }),
    false
  );
  // #9 Terminal state lock
  const alreadyApproved = { ...basePending, pilotId: 'u_p2', status: 'APPROVED' };
  assert.equal(
    canCommandUpdateOrm(coAuth, coRole, alreadyApproved, {
      ...alreadyApproved,
      status: 'REJECTED',
      decisionByUid: 'u_co',
      decidedAt: 'NOW',
      updatedAt: 'NOW',
    }),
    false
  );
  // #10 Ghost field injection
  const validTarget = { ...basePending, pilotId: 'u_p2' };
  assert.equal(
    canCommandUpdateOrm(coAuth, coRole, validTarget, {
      ...validTarget,
      status: 'APPROVED',
      decisionByUid: 'u_co',
      decisionByName: 'Maj Vance',
      decisionByRole: 'CO',
      commandRemarks: 'OK',
      decidedAt: 'NOW',
      updatedAt: 'NOW',
      ghostField: true,
    }),
    false
  );
  // Comd CAN sign off on all missions including their own
  const comdAuth: MockAuth = { uid: 'u_comd', email: 'comd@407.mil', emailVerified: true };
  const comdRole: MockUserRole = {
    uid: 'u_comd',
    displayName: 'Col Vance',
    rankCallsign: 'Col / IRON 01',
    commandRole: 'Comd',
    status: 'Verified',
    isAdmin: true,
  };
  const comdOwnMission = {
    ...basePending,
    pilotId: 'u_comd',
    totalScore: 17,
    requiredMdaRole: 'Comd',
    status: 'PENDING COMD SIGN-OFF',
  };
  assert.equal(
    canCommandUpdateOrm(comdAuth, comdRole, comdOwnMission, {
      ...comdOwnMission,
      status: 'APPROVED',
      decisionByUid: 'u_comd',
      decisionByName: 'Col Vance',
      decisionByRole: 'Comd',
      commandRemarks: 'Commander risk acceptance verified.',
      decidedAt: 'NOW',
      updatedAt: 'NOW',
    }),
    true
  );
});

test('Dirty Dozen #12: blocks unverified email admin spoof', () => {
  const spoofedAdmin: MockAuth = {
    uid: 'u_evil',
    email: BOOTSTRAP_ADMIN_EMAIL,
    emailVerified: false,
  };
  assert.equal(isBootstrappedAdmin(spoofedAdmin), false);
});
