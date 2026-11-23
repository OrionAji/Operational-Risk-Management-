export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_RANK_CALLSIGN_LENGTH = 60;
export const MAX_EMAIL_LENGTH = 160;
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface EmailRegistrationInput {
  displayName: string;
  rankCallsign: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface PendingRegistrationProfile {
  displayName: string;
  rankCallsign: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmailAddress(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Enter your email address.';
  }
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return `Email address must be ${MAX_EMAIL_LENGTH} characters or fewer.`;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address (for example: pilot@407actg.mil or name@outlook.com).';
  }
  return null;
}

export function validateSignInInput(email: string, password: string): string | null {
  const emailError = validateEmailAddress(email);
  if (emailError) return emailError;
  if (!password) {
    return 'Enter your password.';
  }
  return null;
}

export function validateEmailRegistrationInput(input: EmailRegistrationInput): string | null {
  const cleanName = input.displayName.trim();
  const cleanRank = input.rankCallsign.trim();

  if (!cleanName) {
    return 'Enter your full name as listed on unit flight orders.';
  }
  if (cleanName.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Full name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`;
  }
  if (!cleanRank) {
    return 'Enter your Rank and Callsign (for example: Capt / ATLAS 41).';
  }
  if (cleanRank.length > MAX_RANK_CALLSIGN_LENGTH) {
    return `Rank / Callsign must be ${MAX_RANK_CALLSIGN_LENGTH} characters or fewer.`;
  }

  const emailError = validateEmailAddress(input.email);
  if (emailError) return emailError;

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (input.password !== input.confirmPassword) {
    return 'Passwords do not match. Re-enter both fields identically.';
  }
  return null;
}

function extractAuthErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  const message = err instanceof Error ? err.message : String(err ?? '');
  const match = message.match(/auth\/[a-z0-9-]+/i);
  return match ? match[0].toLowerCase() : '';
}

export function formatFirebaseAuthError(err: unknown): string {
  const code = extractAuthErrorCode(err);
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled for this Firebase project. Enable the Email/Password provider in Firebase Console (Authentication -> Sign-in method) to allow non-Google email registration.';
    case 'auth/email-already-in-use':
      return 'An account with this email address is already registered. Switch to Sign In or use Forgot Password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password. Verify your credentials or use Forgot Password.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters with a mix of letters and numbers.';
    case 'auth/too-many-requests':
      return 'Too many authentication attempts. Wait a minute before trying again.';
    case 'auth/user-disabled':
      return 'This account has been disabled by an administrator.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google Sign-In was cancelled before completing authentication.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Allow popups or sign in with your email and password.';
    case 'auth/network-request-failed':
      return 'Network error while reaching authentication servers. Check your connection and retry.';
    default:
      if (err instanceof Error && err.message.trim()) {
        return err.message;
      }
      return 'Authentication could not be completed. Please try again.';
  }
}

const PENDING_PROFILE_STORAGE_PREFIX = 'orm_407_pending_profile_';

export function savePendingRegistrationProfile(
  uid: string,
  profile: PendingRegistrationProfile
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${PENDING_PROFILE_STORAGE_PREFIX}${uid}`,
      JSON.stringify({
        displayName: profile.displayName.trim().slice(0, MAX_DISPLAY_NAME_LENGTH),
        rankCallsign: profile.rankCallsign.trim().slice(0, MAX_RANK_CALLSIGN_LENGTH),
      })
    );
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function loadPendingRegistrationProfile(uid: string): PendingRegistrationProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${PENDING_PROFILE_STORAGE_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingRegistrationProfile>;
    if (
      typeof parsed.displayName === 'string' &&
      parsed.displayName.trim().length > 0 &&
      typeof parsed.rankCallsign === 'string' &&
      parsed.rankCallsign.trim().length > 0
    ) {
      return {
        displayName: parsed.displayName.trim().slice(0, MAX_DISPLAY_NAME_LENGTH),
        rankCallsign: parsed.rankCallsign.trim().slice(0, MAX_RANK_CALLSIGN_LENGTH),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingRegistrationProfile(uid: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${PENDING_PROFILE_STORAGE_PREFIX}${uid}`);
  } catch {
    // Ignore storage errors
  }
}
