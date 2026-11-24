import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { BellRing, X } from 'lucide-react';
import { AdminPanelView } from './components/AdminPanelView';
import { AuthPortal } from './components/AuthPortal';
import { CommandQueueView } from './components/CommandQueueView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { OrmChecklistView } from './components/OrmChecklistView';
import { OrmDetailModal } from './components/OrmDetailModal';
import { PendingVerificationView } from './components/PendingVerificationView';
import { TopNavBar, type ActiveTab } from './components/TopNavBar';
import { getRiskBannerTextColor } from './components/RiskVisuals';
import { auth, googleProvider } from './firebase/config';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  buildAutostartPreviewData,
  createOrmSubmissionInFirestore,
  decideOrmSubmissionInFirestore,
  enablePushNotificationsForUser,
  generateSafeId,
  markNotificationReadInFirestore,
  registerUserAccount,
  saveUserThemePreferenceInFirestore,
  subscribeToAllUserRoles,
  subscribeToAuditLogs,
  subscribeToNotifications,
  subscribeToOrmSubmissions,
  subscribeToOwnUserRole,
  subscribeToUserPrivateInfo,
  triggerLocalPushNotification,
  updateUserRoleAsAdminInFirestore,
} from './services/ormService';
import type {
  AccountStatus,
  AuditLogEntry,
  CommandRole,
  OrmEvaluationResult,
  OrmNotification,
  OrmSubmission,
  ThemePreference,
  UserRoleProfile,
} from './types/orm';
import {
  clearPendingRegistrationProfile,
  formatFirebaseAuthError,
  loadPendingRegistrationProfile,
  savePendingRegistrationProfile,
} from './utils/authValidation';
import { canUserApproveOrm, RISK_TIER_CONFIG, ROLE_HIERARCHY } from './utils/ormScoring';
import {
  applyThemeToDocument,
  getNextThemePreference,
  loadCachedThemePreference,
  saveCachedThemePreference,
} from './utils/themePreference';

function AppShell() {
  const isOnline = useOnlineStatus();

  const previewConfig = useMemo(() => {
    if (typeof window === 'undefined') return { enabled: false, role: null as string | null };
    const params = new URLSearchParams(window.location.search);
    return {
      enabled: params.get('autostart') === '1',
      role: params.get('role'),
    };
  }, []);

  // Auth & Profile State
  const [authReady, setAuthReady] = useState(previewConfig.enabled);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isEmailVerifiedState, setIsEmailVerifiedState] = useState(false);
  const [userProfile, setUserProfile] = useState<UserRoleProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(previewConfig.enabled);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfoMessage, setAuthInfoMessage] = useState<string | null>(null);

  // Operational Data State
  const [allUsers, setAllUsers] = useState<UserRoleProfile[]>([]);
  const [submissions, setSubmissions] = useState<OrmSubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<OrmNotification[]>([]);

  // UI Navigation, Theme & Overlays
  const [theme, setTheme] = useState<ThemePreference>(() => loadCachedThemePreference());
  const [activeTab, setActiveTab] = useState<ActiveTab>('my-orm');
  const [selectedOrmId, setSelectedOrmId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [liveToast, setLiveToast] = useState<OrmNotification | null>(null);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const seenNotificationIds = useRef<Set<string>>(new Set());
  const autoRegisterAttemptedUid = useRef<string | null>(null);

  // Keep DOM root `.dark` class and localStorage cache synchronized with theme state
  useEffect(() => {
    applyThemeToDocument(theme);
    saveCachedThemePreference(theme);
  }, [theme]);

  // Initialize deterministic preview state ONLY when ?autostart=1 is explicitly provided
  useEffect(() => {
    if (!previewConfig.enabled) return;
    if (previewConfig.role === 'VerifyEmail') {
      setAuthReady(true);
      setProfileLoaded(true);
      return;
    }
    const bundle = buildAutostartPreviewData(previewConfig.role);
    setUserProfile(bundle.currentUser);
    setAllUsers(bundle.users);
    setSubmissions(bundle.submissions);
    setAuditLogs(bundle.auditLogs);
    setNotifications(bundle.notifications);
    bundle.notifications.forEach((n) => seenNotificationIds.current.add(n.id));
    setAuthReady(true);
    setProfileLoaded(true);
  }, [previewConfig.enabled, previewConfig.role]);

  // Live Firebase Auth listener
  useEffect(() => {
    if (previewConfig.enabled) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setIsEmailVerifiedState(Boolean(u?.emailVerified));
      setAuthReady(true);
      if (!u) {
        autoRegisterAttemptedUid.current = null;
        setUserProfile(null);
        setProfileLoaded(true);
        setSubmissions([]);
        setAuditLogs([]);
        setNotifications([]);
        setAllUsers([]);
      } else if (!u.emailVerified) {
        setUserProfile(null);
        setProfileLoaded(true);
      } else {
        setProfileLoaded(false);
      }
    });
    return unsub;
  }, [previewConfig.enabled]);

  // Subscribe to signed-in user's verification & role profile ONLY once email ownership is verified
  useEffect(() => {
    if (previewConfig.enabled || !firebaseUser || !isEmailVerifiedState) return;
    const unsub = subscribeToOwnUserRole(firebaseUser.uid, (profile) => {
      setUserProfile(profile);
      setProfileLoaded(true);

      // Auto-complete Firestore registration if user signed up via Email/Password and just verified email
      if (!profile && autoRegisterAttemptedUid.current !== firebaseUser.uid) {
        const pending = loadPendingRegistrationProfile(firebaseUser.uid);
        if (pending) {
          autoRegisterAttemptedUid.current = firebaseUser.uid;
          void registerUserAccount({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: pending.displayName,
            rankCallsign: pending.rankCallsign,
            themePreference: loadCachedThemePreference(),
          })
            .then((created) => {
              clearPendingRegistrationProfile(firebaseUser.uid);
              setUserProfile(created);
            })
            .catch((err) => {
              setAuthError(formatFirebaseAuthError(err));
            });
        }
      }
    });
    return unsub;
  }, [previewConfig.enabled, firebaseUser, isEmailVerifiedState]);

  // Sync user's saved theme preference from their Firestore private profile in real time
  useEffect(() => {
    if (previewConfig.enabled || !firebaseUser || !isEmailVerifiedState) return;
    const unsub = subscribeToUserPrivateInfo(firebaseUser.uid, (privateInfo) => {
      if (privateInfo?.themePreference) {
        setTheme(privateInfo.themePreference);
      }
    });
    return unsub;
  }, [previewConfig.enabled, firebaseUser, isEmailVerifiedState]);

  // Subscribe to operational collections ONLY when user is explicitly Verified
  useEffect(() => {
    if (previewConfig.enabled) return;
    if (!userProfile || userProfile.status !== 'Verified') {
      setSubmissions([]);
      setAuditLogs([]);
      setNotifications([]);
      setAllUsers([]);
      return;
    }

    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeToOrmSubmissions(userProfile, setSubmissions));
    unsubs.push(subscribeToAuditLogs(userProfile, setAuditLogs));
    unsubs.push(subscribeToNotifications(userProfile, setNotifications));

    if (userProfile.isAdmin || userProfile.commandRole !== 'Pilot') {
      unsubs.push(subscribeToAllUserRoles(setAllUsers));
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [previewConfig.enabled, userProfile]);

  // Filter notifications relevant to the current user (direct pilot updates or MDA role alerts)
  const relevantNotifications = useMemo(() => {
    if (!userProfile) return [];
    const myRank = ROLE_HIERARCHY[userProfile.commandRole];
    return notifications.filter((n) => {
      if (n.recipientUid === userProfile.uid) return true;
      if (
        n.type === 'MDA_REVIEW_REQUIRED' &&
        n.senderUid !== userProfile.uid &&
        userProfile.commandRole !== 'Pilot' &&
        myRank >= ROLE_HIERARCHY[n.recipientRole]
      ) {
        return true;
      }
      return false;
    });
  }, [notifications, userProfile]);

  // Trigger real-time in-app toast & browser push notification when new alerts arrive
  useEffect(() => {
    if (!userProfile || userProfile.status !== 'Verified') return;
    for (const notif of relevantNotifications) {
      if (!seenNotificationIds.current.has(notif.id)) {
        seenNotificationIds.current.add(notif.id);
        if (!notif.readBy.includes(userProfile.uid)) {
          setLiveToast(notif);
          triggerLocalPushNotification(notif.title, notif.body, notif.ormId);
        }
      }
    }
  }, [relevantNotifications, userProfile]);

  const unreadNotificationsCount = useMemo(() => {
    if (!userProfile) return 0;
    return relevantNotifications.filter((n) => !n.readBy.includes(userProfile.uid)).length;
  }, [relevantNotifications, userProfile]);

  const mySubmissions = useMemo(() => {
    if (!userProfile) return [];
    return submissions.filter((s) => s.pilotId === userProfile.uid);
  }, [submissions, userProfile]);

  const pendingQueueCount = useMemo(() => {
    if (!userProfile) return 0;
    return submissions.filter((s) => canUserApproveOrm(userProfile, s).allowed).length;
  }, [submissions, userProfile]);

  const pendingUsersCount = useMemo(
    () => allUsers.filter((u) => u.status === 'Pending').length,
    [allUsers]
  );

  const pendingSyncCount = useMemo(
    () => submissions.filter((s) => s.hasPendingWrites).length,
    [submissions]
  );

  const selectedOrm = useMemo(
    () => submissions.find((s) => s.id === selectedOrmId) ?? null,
    [submissions, selectedOrmId]
  );

  // Auth Handlers
  const clearAuthMessages = () => {
    setAuthError(null);
    setAuthInfoMessage(null);
  };

  const handleGoogleSignIn = async () => {
    clearAuthMessages();
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    clearAuthMessages();
    setAuthLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user.emailVerified) {
        await cred.user.getIdToken(true);
        setIsEmailVerifiedState(true);
      } else {
        setIsEmailVerifiedState(false);
        setAuthInfoMessage(
          'Your email address has not been verified yet. Open the link in your inbox or resend a verification email below.'
        );
      }
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailRegister = async (payload: {
    displayName: string;
    rankCallsign: string;
    email: string;
    password: string;
  }) => {
    clearAuthMessages();
    setAuthLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
      savePendingRegistrationProfile(cred.user.uid, {
        displayName: payload.displayName,
        rankCallsign: payload.rankCallsign,
      });
      await updateProfile(cred.user, { displayName: payload.displayName });
      await sendEmailVerification(cred.user);
      setIsEmailVerifiedState(Boolean(cred.user.emailVerified));
      setAuthInfoMessage(
        `Verification link sent to ${payload.email}. Verify your email to submit your account to the Admin approval queue.`
      );
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendPasswordReset = async (email: string): Promise<boolean> => {
    clearAuthMessages();
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCheckEmailVerification = async () => {
    clearAuthMessages();
    if (previewConfig.enabled) {
      setAuthInfoMessage('Verification status checked (preview mode).');
      return;
    }
    const current = auth.currentUser;
    if (!current) return;
    setAuthLoading(true);
    try {
      await current.reload();
      if (!current.emailVerified) {
        setAuthError(
          'Email is not verified yet. Open the verification link sent to your inbox, then click Continue again.'
        );
        return;
      }
      // Refresh JWT so Firestore security rules immediately receive email_verified: true
      await current.getIdToken(true);
      setIsEmailVerifiedState(true);
      setProfileLoaded(false);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    clearAuthMessages();
    if (previewConfig.enabled) {
      setAuthInfoMessage('Verification email resent (preview mode).');
      return;
    }
    const current = auth.currentUser;
    if (!current) return;
    setAuthLoading(true);
    try {
      await sendEmailVerification(current);
      setAuthInfoMessage(
        `A fresh verification link has been sent to ${current.email || 'your email address'}.`
      );
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCompleteRegistration = async (displayName: string, rankCallsign: string) => {
    if (!firebaseUser) return;
    clearAuthMessages();
    setAuthLoading(true);
    try {
      const profile = await registerUserAccount({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName,
        rankCallsign,
        themePreference: theme,
      });
      clearPendingRegistrationProfile(firebaseUser.uid);
      setUserProfile(profile);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = getNextThemePreference(theme);
    setTheme(nextTheme);
    if (!previewConfig.enabled && firebaseUser && isEmailVerifiedState) {
      void saveUserThemePreferenceInFirestore({
        uid: firebaseUser.uid,
        email: firebaseUser.email || userProfile?.email || '',
        theme: nextTheme,
      }).catch(() => {
        // Theme remains applied locally and cached if offline or rules reject before profile exists
      });
    }
  };

  const handleSignOut = async () => {
    clearAuthMessages();
    if (previewConfig.enabled) {
      window.location.href = '/';
      return;
    }
    await signOut(auth);
  };

  const handleSubmitOrm = async (payload: {
    pilotName: string;
    rankCallsign: string;
    sortieDate: string;
    aircraftTail: string;
    missionCallsign: string;
    mitigationNotes: string;
    evaluation: OrmEvaluationResult;
  }) => {
    if (!userProfile) return;
    if (previewConfig.enabled) {
      const nowIso = new Date().toISOString();
      const ormId = generateSafeId('orm');
      const { evaluation } = payload;
      const created: OrmSubmission = {
        id: ormId,
        pilotId: userProfile.uid,
        pilotName: payload.pilotName.trim(),
        rankCallsign: payload.rankCallsign.trim(),
        pilotRole: userProfile.commandRole,
        sortieDate: payload.sortieDate,
        aircraftTail: payload.aircraftTail.trim(),
        missionCallsign: payload.missionCallsign.trim(),
        itemizedBreakdown: evaluation.itemizedBreakdown,
        totalScore: evaluation.totalScore,
        riskLevel: evaluation.riskLevel,
        baseMdaRole: evaluation.baseMdaRole,
        requiredMdaRole: evaluation.requiredMdaRole,
        escalated: evaluation.escalated,
        topRiskDrivers: evaluation.topRiskDrivers,
        mitigationNotes: payload.mitigationNotes.trim(),
        status: evaluation.initialStatus,
        decisionByUid: '',
        decisionByName: '',
        decisionByRole: '',
        commandRemarks: '',
        submittedAt: nowIso,
        updatedAt: nowIso,
      };
      setSubmissions((prev) => [created, ...prev]);
      setAuditLogs((prev) => [
        {
          id: generateSafeId('log'),
          ormId,
          action: evaluation.totalScore <= 5 ? 'ORM_CLEARED_AUTO' : 'ORM_SUBMITTED',
          actorUid: userProfile.uid,
          actorName: created.pilotName,
          actorRole: userProfile.commandRole,
          targetPilotId: userProfile.uid,
          summary: `${created.pilotName} (${created.missionCallsign}) scored ${evaluation.totalScore} pts — ${evaluation.initialStatus}.`,
          score: evaluation.totalScore,
          riskLevel: evaluation.riskLevel,
          timestamp: nowIso,
        },
        ...prev,
      ]);
      if (evaluation.totalScore >= 6) {
        const notif: OrmNotification = {
          id: generateSafeId('ntf'),
          ormId,
          type: 'MDA_REVIEW_REQUIRED',
          recipientUid: `ROLE_${evaluation.requiredMdaRole}`,
          recipientRole: evaluation.requiredMdaRole,
          senderUid: userProfile.uid,
          pilotName: created.pilotName,
          missionCallsign: created.missionCallsign,
          score: evaluation.totalScore,
          riskLevel: evaluation.riskLevel,
          topRiskDrivers: evaluation.topRiskDrivers,
          title: `${evaluation.riskMeta.label} (${evaluation.totalScore} pts) — ${evaluation.requiredMdaRole} Sign-Off Required`,
          body: `${created.pilotName} (${created.missionCallsign}, ${created.aircraftTail}).`,
          readBy: [],
          createdAt: nowIso,
        };
        seenNotificationIds.current.add(notif.id);
        setNotifications((prev) => [notif, ...prev]);
      }
      return;
    }

    await createOrmSubmissionInFirestore({
      user: userProfile,
      ...payload,
    });
  };

  const handleCommandDecision = async (
    orm: OrmSubmission,
    decision: 'APPROVED' | 'REJECTED',
    commandRemarks: string
  ) => {
    if (!userProfile) return;
    if (previewConfig.enabled) {
      const nowIso = new Date().toISOString();
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === orm.id
            ? {
                ...item,
                status: decision,
                decisionByUid: userProfile.uid,
                decisionByName: userProfile.displayName,
                decisionByRole: userProfile.commandRole,
                commandRemarks,
                decidedAt: nowIso,
                updatedAt: nowIso,
              }
            : item
        )
      );
      setAuditLogs((prev) => [
        {
          id: generateSafeId('log'),
          ormId: orm.id,
          action: decision === 'APPROVED' ? 'ORM_APPROVED' : 'ORM_REJECTED',
          actorUid: userProfile.uid,
          actorName: userProfile.displayName,
          actorRole: userProfile.commandRole,
          targetPilotId: orm.pilotId,
          summary: `${userProfile.commandRole} ${userProfile.displayName} ${decision} ${orm.pilotName}'s mission ${orm.missionCallsign} (${orm.totalScore} pts).`,
          score: orm.totalScore,
          riskLevel: orm.riskLevel,
          timestamp: nowIso,
        },
        ...prev,
      ]);
      return;
    }

    await decideOrmSubmissionInFirestore({
      approver: userProfile,
      orm,
      decision,
      commandRemarks,
    });
  };

  const handleAdminUpdateUser = async (
    target: UserRoleProfile,
    updates: { status: AccountStatus; commandRole: CommandRole; isAdmin: boolean }
  ) => {
    if (!userProfile) return;
    if (previewConfig.enabled) {
      const nowIso = new Date().toISOString();
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, ...updates, updatedAt: nowIso } : u))
      );
      setAuditLogs((prev) => [
        {
          id: generateSafeId('log'),
          ormId: '',
          action:
            target.status === 'Pending' && updates.status === 'Verified'
              ? 'USER_VERIFIED'
              : 'USER_ROLE_UPDATED',
          actorUid: userProfile.uid,
          actorName: userProfile.displayName,
          actorRole: `${userProfile.commandRole} / Admin`,
          targetPilotId: target.uid,
          summary: `Admin ${userProfile.displayName} set ${target.displayName} to ${updates.status} · Role: ${updates.commandRole}.`,
          score: 0,
          riskLevel: 'LOW',
          timestamp: nowIso,
        },
        ...prev,
      ]);
      return;
    }

    await updateUserRoleAsAdminInFirestore({
      admin: userProfile,
      target,
      updates,
    });
  };

  const handleMarkNotificationRead = async (notif: OrmNotification) => {
    if (!userProfile) return;
    if (previewConfig.enabled) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id && !n.readBy.includes(userProfile.uid)
            ? { ...n, readBy: [...n.readBy, userProfile.uid] }
            : n
        )
      );
      return;
    }
    await markNotificationReadInFirestore(notif, userProfile.uid);
  };

  const handleEnablePush = async () => {
    if (!userProfile) return;
    const res = await enablePushNotificationsForUser(
      userProfile.uid,
      firebaseUser?.email || userProfile.email || ''
    );
    setPushStatusMessage(res.message);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  };

  // Loading Splash
  if (!authReady || (firebaseUser && isEmailVerifiedState && !profileLoaded)) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0B1120] flex items-center justify-center p-6 transition-colors">
        <div className="text-center space-y-2">
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">407 ACTG ORM</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Verifying credentials and offline cache...</p>
        </div>
      </div>
    );
  }

  // Preview-only Email Verification screen for automated visual inspection
  if (previewConfig.enabled && previewConfig.role === 'VerifyEmail') {
    return (
      <AuthPortal
        mode="verify-email"
        theme={theme}
        onToggleTheme={handleToggleTheme}
        authEmail="1lt.brooks@us.af.mil"
        loading={authLoading}
        error={authError}
        infoMessage={authInfoMessage}
        onClearMessages={clearAuthMessages}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onEmailRegister={handleEmailRegister}
        onSendPasswordReset={handleSendPasswordReset}
        onCheckEmailVerification={handleCheckEmailVerification}
        onResendVerificationEmail={handleResendVerificationEmail}
        onCompleteRegistration={handleCompleteRegistration}
        onSignOut={handleSignOut}
      />
    );
  }

  // Unauthenticated Sign-In & Registration Screen
  if (!previewConfig.enabled && !firebaseUser) {
    return (
      <AuthPortal
        mode="signin"
        theme={theme}
        onToggleTheme={handleToggleTheme}
        loading={authLoading}
        error={authError}
        infoMessage={authInfoMessage}
        onClearMessages={clearAuthMessages}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onEmailRegister={handleEmailRegister}
        onSendPasswordReset={handleSendPasswordReset}
        onCheckEmailVerification={handleCheckEmailVerification}
        onResendVerificationEmail={handleResendVerificationEmail}
        onCompleteRegistration={handleCompleteRegistration}
        onSignOut={handleSignOut}
      />
    );
  }

  // Mandatory Email Verification Gate for non-Google Email/Password registrations
  if (!previewConfig.enabled && firebaseUser && !isEmailVerifiedState) {
    return (
      <AuthPortal
        mode="verify-email"
        theme={theme}
        onToggleTheme={handleToggleTheme}
        authEmail={firebaseUser.email || ''}
        loading={authLoading}
        error={authError}
        infoMessage={authInfoMessage}
        onClearMessages={clearAuthMessages}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onEmailRegister={handleEmailRegister}
        onSendPasswordReset={handleSendPasswordReset}
        onCheckEmailVerification={handleCheckEmailVerification}
        onResendVerificationEmail={handleResendVerificationEmail}
        onCompleteRegistration={handleCompleteRegistration}
        onSignOut={handleSignOut}
      />
    );
  }

  // First-Time Authenticated User Self-Registration (defaults to Pending)
  if (!userProfile) {
    return (
      <AuthPortal
        mode="register"
        theme={theme}
        onToggleTheme={handleToggleTheme}
        authEmail={firebaseUser?.email || ''}
        authDisplayName={firebaseUser?.displayName || ''}
        loading={authLoading}
        error={authError}
        infoMessage={authInfoMessage}
        onClearMessages={clearAuthMessages}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onEmailRegister={handleEmailRegister}
        onSendPasswordReset={handleSendPasswordReset}
        onCheckEmailVerification={handleCheckEmailVerification}
        onResendVerificationEmail={handleResendVerificationEmail}
        onCompleteRegistration={handleCompleteRegistration}
        onSignOut={handleSignOut}
      />
    );
  }

  // Strictly Locked Pending or Suspended Verification Gate
  if (userProfile.status !== 'Verified') {
    return (
      <PendingVerificationView
        profile={userProfile}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  const hasCommandAccess = userProfile.commandRole !== 'Pilot' || userProfile.isAdmin;

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <TopNavBar
        user={userProfile}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingQueueCount={pendingQueueCount}
        pendingUsersCount={pendingUsersCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onSignOut={handleSignOut}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Real-Time Push Alert Toast */}
      {liveToast && (
        <div className="fixed top-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div
            className="px-4 py-2 text-xs font-bold flex items-center justify-between"
            style={{
              backgroundColor: RISK_TIER_CONFIG[liveToast.riskLevel].colorHex,
              color: getRiskBannerTextColor(liveToast.riskLevel),
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{liveToast.title}</span>
            </span>
            <button
              type="button"
              aria-label="Dismiss alert"
              onClick={() => setLiveToast(null)}
              className="p-0.5 hover:bg-black/15 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3.5">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{liveToast.body}</p>
            <button
              type="button"
              onClick={() => {
                void handleMarkNotificationRead(liveToast);
                setSelectedOrmId(liveToast.ormId);
                setLiveToast(null);
              }}
              className="mt-2.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100 underline"
            >
              Inspect Mission ORM
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'my-orm' && (
          <OrmChecklistView
            user={userProfile}
            mySubmissions={mySubmissions}
            onSubmitOrm={handleSubmitOrm}
            onSelectSubmission={(orm) => setSelectedOrmId(orm.id)}
          />
        )}

        {activeTab === 'command-queue' && hasCommandAccess && (
          <CommandQueueView
            user={userProfile}
            submissions={submissions}
            auditLogs={auditLogs}
            onInspectOrm={(orm) => setSelectedOrmId(orm.id)}
            theme={theme}
          />
        )}

        {activeTab === 'admin' && userProfile.isAdmin && (
          <AdminPanelView
            currentUser={userProfile}
            users={allUsers}
            onUpdateUser={handleAdminUpdateUser}
          />
        )}
      </main>

      <OrmDetailModal
        orm={selectedOrm}
        currentUser={userProfile}
        onClose={() => setSelectedOrmId(null)}
        onDecision={hasCommandAccess ? handleCommandDecision : undefined}
      />

      <NotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        user={userProfile}
        notifications={relevantNotifications}
        onMarkRead={handleMarkNotificationRead}
        onSelectOrm={(ormId) => setSelectedOrmId(ormId)}
        pushPermission={pushPermission}
        onEnablePush={handleEnablePush}
        pushStatusMessage={pushStatusMessage}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
