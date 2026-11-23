import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  getFirebaseMessagingSafe,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import type {
  AccountStatus,
  AuditLogEntry,
  CommandRole,
  OrmEvaluationResult,
  OrmNotification,
  OrmSubmission,
  UserRoleProfile,
} from '../types/orm';
import { evaluateOrmChecklist, getDefaultSelections, getTodayIsoDate } from '../utils/ormScoring';

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  if (val && typeof val === 'object' && 'seconds' in val) {
    const secs = Number((val as { seconds: number }).seconds);
    return new Date(secs * 1000).toISOString();
  }
  return new Date().toISOString();
}

function mapUserRoleDoc(data: DocumentData): UserRoleProfile {
  return {
    uid: String(data.uid ?? ''),
    displayName: String(data.displayName ?? ''),
    rankCallsign: String(data.rankCallsign ?? ''),
    commandRole: (data.commandRole ?? 'Pilot') as CommandRole,
    status: (data.status ?? 'Pending') as AccountStatus,
    isAdmin: Boolean(data.isAdmin),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapOrmDoc(data: DocumentData, hasPendingWrites: boolean): OrmSubmission {
  return {
    id: String(data.id ?? ''),
    pilotId: String(data.pilotId ?? ''),
    pilotName: String(data.pilotName ?? ''),
    rankCallsign: String(data.rankCallsign ?? ''),
    pilotRole: (data.pilotRole ?? 'Pilot') as CommandRole,
    sortieDate: String(data.sortieDate ?? ''),
    aircraftTail: String(data.aircraftTail ?? ''),
    missionCallsign: String(data.missionCallsign ?? ''),
    itemizedBreakdown: Array.isArray(data.itemizedBreakdown) ? data.itemizedBreakdown : [],
    totalScore: Number(data.totalScore ?? 0),
    riskLevel: data.riskLevel ?? 'LOW',
    baseMdaRole: (data.baseMdaRole ?? 'Pilot') as CommandRole,
    requiredMdaRole: (data.requiredMdaRole ?? 'Pilot') as CommandRole,
    escalated: Boolean(data.escalated),
    topRiskDrivers: Array.isArray(data.topRiskDrivers) ? data.topRiskDrivers : [],
    mitigationNotes: String(data.mitigationNotes ?? ''),
    status: data.status ?? 'CLEARED',
    decisionByUid: String(data.decisionByUid ?? ''),
    decisionByName: String(data.decisionByName ?? ''),
    decisionByRole: String(data.decisionByRole ?? ''),
    commandRemarks: String(data.commandRemarks ?? ''),
    submittedAt: toIsoString(data.submittedAt),
    decidedAt: data.decidedAt ? toIsoString(data.decidedAt) : undefined,
    updatedAt: toIsoString(data.updatedAt),
    hasPendingWrites,
  };
}

function mapAuditDoc(data: DocumentData): AuditLogEntry {
  return {
    id: String(data.id ?? ''),
    ormId: String(data.ormId ?? ''),
    action: data.action ?? 'ORM_SUBMITTED',
    actorUid: String(data.actorUid ?? ''),
    actorName: String(data.actorName ?? ''),
    actorRole: String(data.actorRole ?? ''),
    targetPilotId: String(data.targetPilotId ?? ''),
    summary: String(data.summary ?? ''),
    score: Number(data.score ?? 0),
    riskLevel: String(data.riskLevel ?? 'LOW'),
    timestamp: toIsoString(data.timestamp),
  };
}

function mapNotificationDoc(data: DocumentData): OrmNotification {
  return {
    id: String(data.id ?? ''),
    ormId: String(data.ormId ?? ''),
    type: data.type ?? 'MDA_REVIEW_REQUIRED',
    recipientUid: String(data.recipientUid ?? ''),
    recipientRole: (data.recipientRole ?? 'CO') as CommandRole,
    senderUid: String(data.senderUid ?? ''),
    pilotName: String(data.pilotName ?? ''),
    missionCallsign: String(data.missionCallsign ?? ''),
    score: Number(data.score ?? 0),
    riskLevel: data.riskLevel ?? 'MODERATE',
    topRiskDrivers: Array.isArray(data.topRiskDrivers) ? data.topRiskDrivers : [],
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    readBy: Array.isArray(data.readBy) ? data.readBy : [],
    createdAt: toIsoString(data.createdAt),
  };
}

export async function fetchUserRole(uid: string): Promise<UserRoleProfile | null> {
  const path = `userRoles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'userRoles', uid));
    if (!snap.exists()) return null;
    return mapUserRoleDoc(snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToOwnUserRole(
  uid: string,
  onData: (profile: UserRoleProfile | null) => void
): () => void {
  const path = `userRoles/${uid}`;
  return onSnapshot(
    doc(db, 'userRoles', uid),
    (snap) => {
      onData(snap.exists() ? mapUserRoleDoc(snap.data()) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function registerUserAccount(params: {
  uid: string;
  email: string;
  displayName: string;
  rankCallsign: string;
}): Promise<UserRoleProfile> {
  const isBootstrap = params.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  const cleanName = params.displayName.trim().slice(0, 100);
  const cleanRank = params.rankCallsign.trim().slice(0, 60);
  const cleanEmail = params.email.trim().slice(0, 160);

  const rolePath = `userRoles/${params.uid}`;
  const privatePath = `users/${params.uid}/private/info`;

  const rolePayload = {
    uid: params.uid,
    displayName: cleanName,
    rankCallsign: cleanRank,
    commandRole: (isBootstrap ? 'Comd' : 'Pilot') as CommandRole,
    status: (isBootstrap ? 'Verified' : 'Pending') as AccountStatus,
    isAdmin: isBootstrap,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const privatePayload = {
    uid: params.uid,
    email: cleanEmail,
    notificationsEnabled: false,
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'userRoles', params.uid), rolePayload);
    batch.set(doc(db, 'users', params.uid, 'private', 'info'), privatePayload);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${rolePath} + ${privatePath}`);
  }

  const nowIso = new Date().toISOString();
  return {
    uid: params.uid,
    displayName: cleanName,
    rankCallsign: cleanRank,
    commandRole: isBootstrap ? 'Comd' : 'Pilot',
    status: isBootstrap ? 'Verified' : 'Pending',
    isAdmin: isBootstrap,
    email: cleanEmail,
    notificationsEnabled: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function subscribeToOrmSubmissions(
  user: UserRoleProfile,
  onData: (items: OrmSubmission[]) => void
): () => void {
  const isCommandOrAdmin = user.isAdmin || user.commandRole !== 'Pilot';
  const path = 'ormSubmissions';
  const q = isCommandOrAdmin
    ? collection(db, path)
    : query(collection(db, path), where('pilotId', '==', user.uid));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapOrmDoc(d.data(), d.metadata.hasPendingWrites))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToAuditLogs(
  user: UserRoleProfile,
  onData: (items: AuditLogEntry[]) => void
): () => void {
  const isCommandOrAdmin = user.isAdmin || user.commandRole !== 'Pilot';
  const path = 'auditLogs';
  const q = isCommandOrAdmin
    ? collection(db, path)
    : query(collection(db, path), where('targetPilotId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapAuditDoc(d.data()))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToNotifications(
  user: UserRoleProfile,
  onData: (items: OrmNotification[]) => void
): () => void {
  const isCommandOrAdmin = user.isAdmin || user.commandRole !== 'Pilot';
  const path = 'notifications';
  const q = isCommandOrAdmin
    ? collection(db, path)
    : query(collection(db, path), where('recipientUid', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapNotificationDoc(d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToAllUserRoles(
  onData: (users: UserRoleProfile[]) => void
): () => void {
  const path = 'userRoles';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapUserRoleDoc(d.data()))
        .sort((a, b) => {
          if (a.status === 'Pending' && b.status !== 'Pending') return -1;
          if (b.status === 'Pending' && a.status !== 'Pending') return 1;
          return b.createdAt.localeCompare(a.createdAt);
        });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createOrmSubmissionInFirestore(params: {
  user: UserRoleProfile;
  pilotName: string;
  rankCallsign: string;
  sortieDate: string;
  aircraftTail: string;
  missionCallsign: string;
  mitigationNotes: string;
  evaluation: OrmEvaluationResult;
}): Promise<string> {
  const ormId = generateSafeId('orm');
  const logId = generateSafeId('log');
  const notifId = generateSafeId('ntf');

  const cleanPilotName = params.pilotName.trim().slice(0, 100);
  const cleanRank = params.rankCallsign.trim().slice(0, 60);
  const cleanTail = params.aircraftTail.trim().slice(0, 40);
  const cleanCallsign = params.missionCallsign.trim().slice(0, 40);
  const cleanMitigation = params.mitigationNotes.trim().slice(0, 2000);
  const { evaluation } = params;

  const ormDoc = {
    id: ormId,
    pilotId: params.user.uid,
    pilotName: cleanPilotName,
    rankCallsign: cleanRank,
    pilotRole: params.user.commandRole,
    sortieDate: params.sortieDate.trim(),
    aircraftTail: cleanTail,
    missionCallsign: cleanCallsign,
    itemizedBreakdown: evaluation.itemizedBreakdown,
    totalScore: evaluation.totalScore,
    riskLevel: evaluation.riskLevel,
    baseMdaRole: evaluation.baseMdaRole,
    requiredMdaRole: evaluation.requiredMdaRole,
    escalated: evaluation.escalated,
    topRiskDrivers: evaluation.topRiskDrivers.slice(0, 5),
    mitigationNotes: cleanMitigation,
    status: evaluation.initialStatus,
    decisionByUid: '',
    decisionByName: '',
    decisionByRole: '',
    commandRemarks: '',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const auditAction = evaluation.totalScore <= 5 ? 'ORM_CLEARED_AUTO' : 'ORM_SUBMITTED';
  const auditSummary =
    evaluation.totalScore <= 5
      ? `${cleanPilotName} (${cleanCallsign}) scored ${evaluation.totalScore} pts — LOW RISK auto-cleared.`
      : `${cleanPilotName} (${cleanCallsign}) scored ${evaluation.totalScore} pts (${evaluation.riskMeta.label}) — routed to ${evaluation.requiredMdaRole}${evaluation.escalated ? ' (Escalated)' : ''}.`;

  const auditDoc = {
    id: logId,
    ormId,
    action: auditAction,
    actorUid: params.user.uid,
    actorName: cleanPilotName,
    actorRole: params.user.commandRole,
    targetPilotId: params.user.uid,
    summary: auditSummary.slice(0, 300),
    score: evaluation.totalScore,
    riskLevel: evaluation.riskLevel,
    timestamp: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'ormSubmissions', ormId), ormDoc);
    batch.set(doc(db, 'auditLogs', logId), auditDoc);

    if (evaluation.totalScore >= 6) {
      const driversText =
        evaluation.topRiskDrivers.length > 0
          ? `Top drivers: ${evaluation.topRiskDrivers.join('; ')}`
          : 'Elevated composite score.';
      const notifDoc = {
        id: notifId,
        ormId,
        type: 'MDA_REVIEW_REQUIRED',
        recipientUid: `ROLE_${evaluation.requiredMdaRole}`,
        recipientRole: evaluation.requiredMdaRole,
        senderUid: params.user.uid,
        pilotName: cleanPilotName,
        missionCallsign: cleanCallsign,
        score: evaluation.totalScore,
        riskLevel: evaluation.riskLevel,
        topRiskDrivers: evaluation.topRiskDrivers.slice(0, 5),
        title: `${evaluation.riskMeta.label} (${evaluation.totalScore} pts) — ${evaluation.requiredMdaRole} Sign-Off Required`.slice(
          0,
          140
        ),
        body: `${cleanPilotName} (${cleanCallsign}, ${cleanTail}). ${driversText}`.slice(0, 400),
        readBy: [],
        createdAt: serverTimestamp(),
      };
      batch.set(doc(db, 'notifications', notifId), notifDoc);
    }

    await batch.commit();
    return ormId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `ormSubmissions/${ormId}`);
  }
}

export async function decideOrmSubmissionInFirestore(params: {
  approver: UserRoleProfile;
  orm: OrmSubmission;
  decision: 'APPROVED' | 'REJECTED';
  commandRemarks: string;
}): Promise<void> {
  const logId = generateSafeId('log');
  const notifId = generateSafeId('ntf');
  const cleanRemarks = params.commandRemarks.trim().slice(0, 2000);

  const action = params.decision === 'APPROVED' ? 'ORM_APPROVED' : 'ORM_REJECTED';
  const summary = `${params.approver.commandRole} ${params.approver.displayName} ${
    params.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED / HELD'
  } ${params.orm.pilotName}'s mission ${params.orm.missionCallsign} (${params.orm.totalScore} pts).`;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'ormSubmissions', params.orm.id), {
      status: params.decision,
      decisionByUid: params.approver.uid,
      decisionByName: params.approver.displayName.slice(0, 100),
      decisionByRole: params.approver.commandRole,
      commandRemarks: cleanRemarks,
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      ormId: params.orm.id,
      action,
      actorUid: params.approver.uid,
      actorName: params.approver.displayName.slice(0, 100),
      actorRole: params.approver.commandRole,
      targetPilotId: params.orm.pilotId,
      summary: summary.slice(0, 300),
      score: params.orm.totalScore,
      riskLevel: params.orm.riskLevel,
      timestamp: serverTimestamp(),
    });

    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      ormId: params.orm.id,
      type: 'ORM_DECISION',
      recipientUid: params.orm.pilotId,
      recipientRole: params.orm.pilotRole,
      senderUid: params.approver.uid,
      pilotName: params.orm.pilotName,
      missionCallsign: params.orm.missionCallsign,
      score: params.orm.totalScore,
      riskLevel: params.orm.riskLevel,
      topRiskDrivers: params.orm.topRiskDrivers.slice(0, 5),
      title: `Mission ${params.orm.missionCallsign} ${
        params.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED / HELD'
      } by ${params.approver.commandRole}`.slice(0, 140),
      body: (
        cleanRemarks ||
        `${params.approver.displayName} (${params.approver.commandRole}) ${params.decision.toLowerCase()} your ${params.orm.totalScore}-pt ORM.`
      ).slice(0, 400),
      readBy: [],
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `ormSubmissions/${params.orm.id}`);
  }
}

export async function updateUserRoleAsAdminInFirestore(params: {
  admin: UserRoleProfile;
  target: UserRoleProfile;
  updates: {
    status: AccountStatus;
    commandRole: CommandRole;
    isAdmin: boolean;
  };
}): Promise<void> {
  const logId = generateSafeId('log');
  const action =
    params.target.status === 'Pending' && params.updates.status === 'Verified'
      ? 'USER_VERIFIED'
      : params.updates.status === 'Suspended'
        ? 'USER_SUSPENDED'
        : 'USER_ROLE_UPDATED';

  const summary = `Admin ${params.admin.displayName} set ${params.target.displayName} to ${params.updates.status} · Role: ${params.updates.commandRole}${params.updates.isAdmin ? ' (Admin)' : ''}.`;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'userRoles', params.target.uid), {
      displayName: params.target.displayName,
      rankCallsign: params.target.rankCallsign,
      commandRole: params.updates.commandRole,
      status: params.updates.status,
      isAdmin: params.updates.isAdmin,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      ormId: '',
      action,
      actorUid: params.admin.uid,
      actorName: params.admin.displayName.slice(0, 100),
      actorRole: `${params.admin.commandRole} / Admin`,
      targetPilotId: params.target.uid,
      summary: summary.slice(0, 300),
      score: 0,
      riskLevel: 'LOW',
      timestamp: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `userRoles/${params.target.uid}`);
  }
}

export async function markNotificationReadInFirestore(
  notif: OrmNotification,
  uid: string
): Promise<void> {
  if (notif.readBy.includes(uid)) return;
  const nextReadBy = [...notif.readBy, uid].slice(0, 50);
  try {
    await updateDoc(doc(db, 'notifications', notif.id), {
      readBy: nextReadBy,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notif.id}`);
  }
}

export async function enablePushNotificationsForUser(
  uid: string,
  email: string
): Promise<{ granted: boolean; token?: string; message: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, message: 'Push notifications are not supported by this browser.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { granted: false, message: 'Notification permission was denied in browser settings.' };
  }

  let fcmToken = '';
  try {
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = await getFirebaseMessagingSafe();
    if (messaging) {
      try {
        fcmToken = (await getToken(messaging, { serviceWorkerRegistration: swReg })) || '';
      } catch {
        // Fallback cleanly when VAPID key is not configured in Firebase Console yet
      }
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || '407 ACTG ORM Alert';
        const body = payload.notification?.body || 'Mission risk update received.';
        void swReg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
        });
      });
    }
  } catch {
    // SW registration fallback handled gracefully
  }

  if (uid && !uid.startsWith('preview_')) {
    try {
      await setDoc(
        doc(db, 'users', uid, 'private', 'info'),
        {
          uid,
          email: email || 'pilot@407actg.mil',
          ...(fcmToken ? { fcmToken: fcmToken.slice(0, 512) } : {}),
          notificationsEnabled: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Non-fatal if private info update fails offline
    }
  }

  return {
    granted: true,
    token: fcmToken || undefined,
    message: fcmToken
      ? 'FCM Push Notifications active and device token registered.'
      : 'Browser Push Alerts enabled for live MDA & sign-off notifications.',
  };
}

export function triggerLocalPushNotification(title: string, body: string, tag: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag,
        })
      )
      .catch(() => {
        new Notification(title, { body, icon: '/pwa-192x192.png', tag });
      });
  } else {
    new Notification(title, { body, icon: '/pwa-192x192.png', tag });
  }
}

// =============================================================================
// DETERMINISTIC PREVIEW DATA (STRICTLY FOR ?autostart=1 VERIFICATION MODE)
// =============================================================================

export interface PreviewSeedBundle {
  currentUser: UserRoleProfile;
  users: UserRoleProfile[];
  submissions: OrmSubmission[];
  auditLogs: AuditLogEntry[];
  notifications: OrmNotification[];
}

export function buildAutostartPreviewData(roleParam: string | null): PreviewSeedBundle {
  const today = getTodayIsoDate();
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

  const users: UserRoleProfile[] = [
    {
      uid: 'preview_comd',
      displayName: 'Col Marcus Vance',
      rankCallsign: 'Col / IRON 01',
      commandRole: 'Comd',
      status: 'Verified',
      isAdmin: true,
      email: 'm.vance@407actg.mil',
      createdAt: minsAgo(4000),
      updatedAt: minsAgo(60),
    },
    {
      uid: 'preview_goo',
      displayName: 'LtCol Elena Rostova',
      rankCallsign: 'LtCol / VECTOR',
      commandRole: 'GOO',
      status: 'Verified',
      isAdmin: false,
      email: 'e.rostova@407actg.mil',
      createdAt: minsAgo(3800),
      updatedAt: minsAgo(120),
    },
    {
      uid: 'preview_co',
      displayName: 'Maj David Mercer',
      rankCallsign: 'Maj / HAWK 2',
      commandRole: 'CO',
      status: 'Verified',
      isAdmin: false,
      email: 'd.mercer@407actg.mil',
      createdAt: minsAgo(3500),
      updatedAt: minsAgo(180),
    },
    {
      uid: 'preview_pilot',
      displayName: 'Capt Sofia Reyes',
      rankCallsign: 'Capt / ATLAS 41',
      commandRole: 'Pilot',
      status: 'Verified',
      isAdmin: false,
      email: 's.reyes@407actg.mil',
      createdAt: minsAgo(2400),
      updatedAt: minsAgo(200),
    },
    {
      uid: 'preview_pending',
      displayName: '1Lt Owen Brooks',
      rankCallsign: '1Lt / NOMAD 09',
      commandRole: 'Pilot',
      status: 'Pending',
      isAdmin: false,
      email: 'o.brooks@407actg.mil',
      createdAt: minsAgo(35),
      updatedAt: minsAgo(35),
    },
  ];

  let currentUser = users[0]; // Default Comd + Admin for full unified view
  if (roleParam === 'CO') currentUser = users[2];
  else if (roleParam === 'GOO') currentUser = users[1];
  else if (roleParam === 'Pilot') currentUser = users[3];
  else if (roleParam === 'Pending') currentUser = users[4];

  // Sample 1: Capt Reyes — 9 pts MODERATE (PENDING CO SIGN-OFF)
  const selMod = getDefaultSelections();
  selMod.last_sortie = { optionId: 'gt_14', points: 2 };
  selMod.sleep_cycle = { optionId: 'rested', points: 2 };
  selMod.sortie_type = { optionId: 'cas_sat_bsa', points: 2 };
  selMod.short_notice_change = { optionId: 'pre_brief', points: 1 };
  selMod.winds_destination = { optionId: 'high', points: 2 };
  const evalMod = evaluateOrmChecklist(selMod, 'Pilot');

  // Sample 2: Maj Mercer (CO) — 10 pts MODERATE escalated CO -> GOO (Anti-Self-Approval!)
  const selEsc = getDefaultSelections();
  selEsc.consecutive_flying_days = { optionId: '5_to_7', points: 2 };
  selEsc.personal_stress = { optionId: 'medium', points: 3 };
  selEsc.low_level_sortie = { optionId: 'lowat', points: 2 };
  selEsc.wx_destination = { optionId: 'imc', points: 1 };
  selEsc.night_illumination = { optionId: 'low_illum', points: 2 };
  const evalEsc = evaluateOrmChecklist(selEsc, 'CO');

  // Sample 3: LtCol Rostova (GOO) — 17 pts SEVERE (PENDING COMD SIGN-OFF)
  const selSev = getDefaultSelections();
  selSev.last_sortie = { optionId: 'gt_21', points: 4 };
  selSev.sleep_cycle = { optionId: 'rested', points: 3 };
  selSev.sortie_type = { optionId: 'evaluation', points: 5 };
  selSev.low_level_sortie = { optionId: 'mountainous_hi_da', points: 4 };
  selSev.its_thermal_stress = { optionId: 'caution', points: 1 };
  const evalSev = evaluateOrmChecklist(selSev, 'GOO');

  // Sample 4: Capt Reyes — 3 pts LOW (CLEARED)
  const selLow = getDefaultSelections();
  selLow.last_sortie = { optionId: 'gt_7', points: 1 };
  selLow.sortie_type = { optionId: 'off_station', points: 1 };
  selLow.wx_destination = { optionId: 'imc', points: 1 };
  const evalLow = evaluateOrmChecklist(selLow, 'Pilot');

  const submissions: OrmSubmission[] = [
    {
      id: 'orm_seed_sev',
      pilotId: 'preview_goo',
      pilotName: 'LtCol Elena Rostova',
      rankCallsign: 'LtCol / VECTOR',
      pilotRole: 'GOO',
      sortieDate: today,
      aircraftTail: 'C-130J #4079',
      missionCallsign: 'SPEAR 04',
      itemizedBreakdown: evalSev.itemizedBreakdown,
      totalScore: evalSev.totalScore,
      riskLevel: evalSev.riskLevel,
      baseMdaRole: evalSev.baseMdaRole,
      requiredMdaRole: evalSev.requiredMdaRole,
      escalated: evalSev.escalated,
      topRiskDrivers: evalSev.topRiskDrivers,
      mitigationNotes:
        'Assigned senior Instructor Pilot as right-seat safety monitor. Raised route floor by 500ft AGL and briefed hard abort fuel/temp limits.',
      status: evalSev.initialStatus,
      decisionByUid: '',
      decisionByName: '',
      decisionByRole: '',
      commandRemarks: '',
      submittedAt: minsAgo(14),
      updatedAt: minsAgo(14),
    },
    {
      id: 'orm_seed_esc',
      pilotId: 'preview_co',
      pilotName: 'Maj David Mercer',
      rankCallsign: 'Maj / HAWK 2',
      pilotRole: 'CO',
      sortieDate: today,
      aircraftTail: 'C-130J #4074',
      missionCallsign: 'HAWK 21',
      itemizedBreakdown: evalEsc.itemizedBreakdown,
      totalScore: evalEsc.totalScore,
      riskLevel: evalEsc.riskLevel,
      baseMdaRole: evalEsc.baseMdaRole,
      requiredMdaRole: evalEsc.requiredMdaRole,
      escalated: evalEsc.escalated,
      topRiskDrivers: evalEsc.topRiskDrivers,
      mitigationNotes:
        'Full NVG preflight check complete. Added 30 min pre-brief crew rest buffer and designated alternate VMC recovery field.',
      status: evalEsc.initialStatus,
      decisionByUid: '',
      decisionByName: '',
      decisionByRole: '',
      commandRemarks: '',
      submittedAt: minsAgo(38),
      updatedAt: minsAgo(38),
    },
    {
      id: 'orm_seed_mod',
      pilotId: 'preview_pilot',
      pilotName: 'Capt Sofia Reyes',
      rankCallsign: 'Capt / ATLAS 41',
      pilotRole: 'Pilot',
      sortieDate: today,
      aircraftTail: 'C-130J #4071',
      missionCallsign: 'ATLAS 41',
      itemizedBreakdown: evalMod.itemizedBreakdown,
      totalScore: evalMod.totalScore,
      riskLevel: evalMod.riskLevel,
      baseMdaRole: evalMod.baseMdaRole,
      requiredMdaRole: evalMod.requiredMdaRole,
      escalated: evalMod.escalated,
      topRiskDrivers: evalMod.topRiskDrivers,
      mitigationNotes:
        'Crosswind limits verified within aircraft envelope. Conducting extended approach brief with copilot prior to step.',
      status: evalMod.initialStatus,
      decisionByUid: '',
      decisionByName: '',
      decisionByRole: '',
      commandRemarks: '',
      submittedAt: minsAgo(52),
      updatedAt: minsAgo(52),
    },
    {
      id: 'orm_seed_low',
      pilotId: 'preview_pilot',
      pilotName: 'Capt Sofia Reyes',
      rankCallsign: 'Capt / ATLAS 41',
      pilotRole: 'Pilot',
      sortieDate: today,
      aircraftTail: 'C-130J #4071',
      missionCallsign: 'ATLAS 12',
      itemizedBreakdown: evalLow.itemizedBreakdown,
      totalScore: evalLow.totalScore,
      riskLevel: evalLow.riskLevel,
      baseMdaRole: evalLow.baseMdaRole,
      requiredMdaRole: evalLow.requiredMdaRole,
      escalated: evalLow.escalated,
      topRiskDrivers: evalLow.topRiskDrivers,
      mitigationNotes: '',
      status: 'CLEARED',
      decisionByUid: '',
      decisionByName: '',
      decisionByRole: '',
      commandRemarks: '',
      submittedAt: minsAgo(160),
      updatedAt: minsAgo(160),
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'log_seed_1',
      ormId: 'orm_seed_sev',
      action: 'ORM_SUBMITTED',
      actorUid: 'preview_goo',
      actorName: 'LtCol Elena Rostova',
      actorRole: 'GOO',
      targetPilotId: 'preview_goo',
      summary: 'LtCol Elena Rostova (SPEAR 04) scored 17 pts (SEVERE RISK) — routed to Comd.',
      score: 17,
      riskLevel: 'SEVERE',
      timestamp: minsAgo(14),
    },
    {
      id: 'log_seed_2',
      ormId: 'orm_seed_esc',
      action: 'ORM_SUBMITTED',
      actorUid: 'preview_co',
      actorName: 'Maj David Mercer',
      actorRole: 'CO',
      targetPilotId: 'preview_co',
      summary:
        'Maj David Mercer (HAWK 21) scored 10 pts (MODERATE RISK) — auto-escalated CO -> GOO.',
      score: 10,
      riskLevel: 'MODERATE',
      timestamp: minsAgo(38),
    },
    {
      id: 'log_seed_3',
      ormId: 'orm_seed_mod',
      action: 'ORM_SUBMITTED',
      actorUid: 'preview_pilot',
      actorName: 'Capt Sofia Reyes',
      actorRole: 'Pilot',
      targetPilotId: 'preview_pilot',
      summary: 'Capt Sofia Reyes (ATLAS 41) scored 9 pts (MODERATE RISK) — routed to CO.',
      score: 9,
      riskLevel: 'MODERATE',
      timestamp: minsAgo(52),
    },
    {
      id: 'log_seed_4',
      ormId: 'orm_seed_low',
      action: 'ORM_CLEARED_AUTO',
      actorUid: 'preview_pilot',
      actorName: 'Capt Sofia Reyes',
      actorRole: 'Pilot',
      targetPilotId: 'preview_pilot',
      summary: 'Capt Sofia Reyes (ATLAS 12) scored 3 pts — LOW RISK auto-cleared.',
      score: 3,
      riskLevel: 'LOW',
      timestamp: minsAgo(160),
    },
  ];

  const notifications: OrmNotification[] = [
    {
      id: 'ntf_seed_1',
      ormId: 'orm_seed_sev',
      type: 'MDA_REVIEW_REQUIRED',
      recipientUid: 'ROLE_Comd',
      recipientRole: 'Comd',
      senderUid: 'preview_goo',
      pilotName: 'LtCol Elena Rostova',
      missionCallsign: 'SPEAR 04',
      score: 17,
      riskLevel: 'SEVERE',
      topRiskDrivers: evalSev.topRiskDrivers,
      title: 'SEVERE RISK (17 pts) — Comd Sign-Off Required',
      body: `LtCol Elena Rostova (SPEAR 04, C-130J #4079). Top drivers: ${evalSev.topRiskDrivers.join('; ')}`,
      readBy: [],
      createdAt: minsAgo(14),
    },
    {
      id: 'ntf_seed_2',
      ormId: 'orm_seed_esc',
      type: 'MDA_REVIEW_REQUIRED',
      recipientUid: 'ROLE_GOO',
      recipientRole: 'GOO',
      senderUid: 'preview_co',
      pilotName: 'Maj David Mercer',
      missionCallsign: 'HAWK 21',
      score: 10,
      riskLevel: 'MODERATE',
      topRiskDrivers: evalEsc.topRiskDrivers,
      title: 'MODERATE RISK (10 pts) — Escalated to GOO',
      body: `Maj David Mercer (HAWK 21, C-130J #4074). Anti-Self-Approval escalation from CO.`,
      readBy: [],
      createdAt: minsAgo(38),
    },
    {
      id: 'ntf_seed_3',
      ormId: 'orm_seed_mod',
      type: 'MDA_REVIEW_REQUIRED',
      recipientUid: 'ROLE_CO',
      recipientRole: 'CO',
      senderUid: 'preview_pilot',
      pilotName: 'Capt Sofia Reyes',
      missionCallsign: 'ATLAS 41',
      score: 9,
      riskLevel: 'MODERATE',
      topRiskDrivers: evalMod.topRiskDrivers,
      title: 'MODERATE RISK (9 pts) — CO Sign-Off Required',
      body: `Capt Sofia Reyes (ATLAS 41, C-130J #4071). Top drivers: ${evalMod.topRiskDrivers.join('; ')}`,
      readBy: [],
      createdAt: minsAgo(52),
    },
  ];

  return { currentUser, users, submissions, auditLogs, notifications };
}
