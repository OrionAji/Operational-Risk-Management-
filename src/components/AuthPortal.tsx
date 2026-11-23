import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_RANK_CALLSIGN_LENGTH,
  validateEmailAddress,
  validateEmailRegistrationInput,
  validateSignInInput,
} from '../utils/authValidation';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthPortalProps {
  mode: 'signin' | 'verify-email' | 'register';
  authEmail?: string;
  authDisplayName?: string;
  loading: boolean;
  error: string | null;
  infoMessage?: string | null;
  onClearMessages?: () => void;
  onGoogleSignIn: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailRegister: (payload: {
    displayName: string;
    rankCallsign: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<boolean>;
  onCheckEmailVerification: () => Promise<void>;
  onResendVerificationEmail: () => Promise<void>;
  onCompleteRegistration: (displayName: string, rankCallsign: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

const EMBLEM_SRC = '/src/assets/images/unit_emblem_407_1795395954919.jpg';
const BACKDROP_SRC = '/src/assets/images/flightline_hangar_backdrop_1795395950361.jpg';

export const AuthPortal: React.FC<AuthPortalProps> = ({
  mode,
  authEmail,
  authDisplayName,
  loading,
  error,
  infoMessage,
  onClearMessages,
  onGoogleSignIn,
  onEmailSignIn,
  onEmailRegister,
  onSendPasswordReset,
  onCheckEmailVerification,
  onResendVerificationEmail,
  onCompleteRegistration,
  onSignOut,
}) => {
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Sign-In & Reset form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Email Sign-Up form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpRank, setSignUpRank] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Post-Auth Profile Completion state (Google first-time or cross-device email verification)
  const [displayName, setDisplayName] = useState(authDisplayName || '');
  const [rankCallsign, setRankCallsign] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [localInfo, setLocalInfo] = useState<string | null>(null);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [emblemFailed, setEmblemFailed] = useState(false);

  useEffect(() => {
    if (authDisplayName && !displayName) {
      setDisplayName(authDisplayName);
    }
  }, [authDisplayName, displayName]);

  const switchAuthTab = (tab: 'signin' | 'signup') => {
    setAuthTab(tab);
    setShowResetPassword(false);
    setFormError(null);
    setLocalInfo(null);
    onClearMessages?.();
  };

  const handleEmailSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLocalInfo(null);
    onClearMessages?.();
    const validationError = validateSignInInput(signInEmail, signInPassword);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    await onEmailSignIn(signInEmail.trim(), signInPassword);
  };

  const handleEmailSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLocalInfo(null);
    onClearMessages?.();
    const validationError = validateEmailRegistrationInput({
      displayName: signUpName,
      rankCallsign: signUpRank,
      email: signUpEmail,
      password: signUpPassword,
      confirmPassword: signUpConfirmPassword,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }
    await onEmailRegister({
      displayName: signUpName.trim(),
      rankCallsign: signUpRank.trim(),
      email: signUpEmail.trim(),
      password: signUpPassword,
    });
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLocalInfo(null);
    onClearMessages?.();
    const emailError = validateEmailAddress(resetEmail);
    if (emailError) {
      setFormError(emailError);
      return;
    }
    const sent = await onSendPasswordReset(resetEmail.trim());
    if (sent) {
      setLocalInfo(
        `Password reset instructions have been sent to ${resetEmail.trim()}. Check your inbox and spam folder.`
      );
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    onClearMessages?.();
    if (!displayName.trim()) {
      setFormError('Enter your full name as listed on unit flight orders.');
      return;
    }
    if (!rankCallsign.trim()) {
      setFormError('Enter your Rank and Callsign (for example: Capt / ATLAS 41).');
      return;
    }
    await onCompleteRegistration(displayName.trim(), rankCallsign.trim());
  };

  const activeError = formError || error;
  const activeInfo = localInfo || infoMessage;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F4F5F7]">
      {/* Left Flightline Visual Column */}
      <div className="relative lg:col-span-7 min-h-[260px] lg:min-h-screen bg-[#0F172A] overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {!backdropFailed && (
          <img
            src={BACKDROP_SRC}
            alt="407 ACTG airlift flightline at dawn"
            referrerPolicy="no-referrer"
            onError={() => setBackdropFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/65 to-[#0F172A]/45"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!emblemFailed ? (
              <img
                src={EMBLEM_SRC}
                alt="407 ACTG Unit Emblem"
                referrerPolicy="no-referrer"
                onError={() => setEmblemFailed(true)}
                className="w-11 h-11 rounded-lg object-cover border border-white/20"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-800 border border-white/20 flex items-center justify-center text-white font-display font-bold text-lg">
                407
              </div>
            )}
            <span className="font-display text-2xl font-bold tracking-wide text-white whitespace-nowrap">
              407 ACTG ORM
            </span>
          </div>
          <PWAInstallButton />
        </div>

        <div className="relative z-10 max-w-xl mt-10 lg:mt-0">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.06] tracking-tight text-balance">
            Operational Risk Management for Flightline Readiness
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed max-w-lg">
            Complete pre-flight risk worksheets across Human Factors, Mission, and Environment
            with real-time Mission Decision Authority routing, offline caching, and immutable
            command sign-off trails.
          </p>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/15">
            <div>
              <div className="font-mono-data text-xs font-semibold text-[#66BB6A]">0–5 Pts</div>
              <div className="text-xs text-slate-200 mt-0.5">Low · Pilot Cleared</div>
            </div>
            <div>
              <div className="font-mono-data text-xs font-semibold text-[#FBC02D]">6–12 Pts</div>
              <div className="text-xs text-slate-200 mt-0.5">Moderate · CO</div>
            </div>
            <div>
              <div className="font-mono-data text-xs font-semibold text-[#FB8C00]">13–15 Pts</div>
              <div className="text-xs text-slate-200 mt-0.5">High · GOO</div>
            </div>
            <div>
              <div className="font-mono-data text-xs font-semibold text-[#EF5350]">16+ Pts</div>
              <div className="text-xs text-slate-200 mt-0.5">Severe · Comd</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Authentication / Self-Registration Column */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
          {mode === 'signin' && (
            <>
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold mb-2">
                <Lock className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <span>Restricted Aviation Personnel Portal</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
                {showResetPassword
                  ? 'Reset Account Password'
                  : authTab === 'signin'
                    ? 'Sign In to Flightline ORM'
                    : 'Register Pilot Account'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                {showResetPassword
                  ? 'Enter your registered email address to receive a password reset link.'
                  : authTab === 'signin'
                    ? 'Sign in with any registered email account (.mil, Outlook, Yahoo, iCloud, Gmail) or Google.'
                    : 'Register with any email account. New accounts require email verification and remain Pending until an Admin approves access.'}
              </p>

              {/* Sign In / Create Account Tab Switcher */}
              {!showResetPassword && (
                <div
                  role="tablist"
                  aria-label="Authentication mode"
                  className="mt-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 border border-slate-200"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authTab === 'signin'}
                    onClick={() => switchAuthTab('signin')}
                    className={`min-h-[40px] rounded-md text-xs font-semibold transition-colors ${
                      authTab === 'signin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authTab === 'signup'}
                    onClick={() => switchAuthTab('signup')}
                    className={`min-h-[40px] rounded-md text-xs font-semibold transition-colors ${
                      authTab === 'signup'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {activeError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-[#C62828]/30 bg-[#C62828]/8 px-4 py-3 text-sm text-[#C62828]"
                >
                  {activeError}
                </div>
              )}

              {activeInfo && (
                <div
                  role="status"
                  className="mt-4 rounded-lg border border-[#2E7D32]/30 bg-[#2E7D32]/8 px-4 py-3 text-sm text-[#1B5E20]"
                >
                  {activeInfo}
                </div>
              )}

              {/* Forgot Password Sub-View */}
              {showResetPassword ? (
                <form onSubmit={(e) => void handlePasswordResetSubmit(e)} noValidate className="mt-5">
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Registered Email Address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={MAX_EMAIL_LENGTH}
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@outlook.com or pilot@407.mil"
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-5 w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                  >
                    <span>{loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false);
                      setFormError(null);
                      setLocalInfo(null);
                      onClearMessages?.();
                    }}
                    className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              ) : authTab === 'signin' ? (
                <>
                  <form onSubmit={(e) => void handleEmailSignInSubmit(e)} noValidate className="mt-5 space-y-4">
                    <div>
                      <label
                        htmlFor="signin-email"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Email Address
                      </label>
                      <input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={MAX_EMAIL_LENGTH}
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="name@outlook.com or pilot@407.mil"
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="signin-password"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(signInEmail);
                            setShowResetPassword(true);
                            setFormError(null);
                            setLocalInfo(null);
                            onClearMessages?.();
                          }}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="signin-password"
                          type={showSignInPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white pl-3.5 pr-11 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                        />
                        <button
                          type="button"
                          aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowSignInPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-800"
                        >
                          {showSignInPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                    >
                      <span>{loading ? 'Signing In...' : 'Sign In with Email'}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </form>

                  <div className="relative my-5 flex items-center">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="mx-3 text-xs font-medium text-slate-500">or</span>
                    <div className="flex-grow border-t border-slate-200" />
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setFormError(null);
                      setLocalInfo(null);
                      void onGoogleSignIn();
                    }}
                    className="w-full min-h-[46px] inline-flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M21.35 11.1h-9.18v2.92h5.27c-.23 1.47-1.69 4.31-5.27 4.31-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.01.77 3.7 1.43l2.52-2.44C16.77 4.1 14.68 3.2 12.17 3.2 7.21 3.2 3.2 7.21 3.2 12.48s4.01 9.28 8.97 9.28c5.18 0 8.61-3.64 8.61-8.77 0-.59-.07-1.26-.18-1.89z"
                      />
                    </svg>
                    <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
                  </button>
                </>
              ) : (
                <>
                  <form onSubmit={(e) => void handleEmailSignUpSubmit(e)} noValidate className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="signup-display-name"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="signup-display-name"
                          type="text"
                          autoComplete="name"
                          required
                          maxLength={MAX_DISPLAY_NAME_LENGTH}
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          placeholder="Capt Sofia Reyes"
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="signup-rank-callsign"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Rank / Callsign
                        </label>
                        <input
                          id="signup-rank-callsign"
                          type="text"
                          required
                          maxLength={MAX_RANK_CALLSIGN_LENGTH}
                          value={signUpRank}
                          onChange={(e) => setSignUpRank(e.target.value)}
                          placeholder="Capt / ATLAS 41"
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Email Address (Any Provider)
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={MAX_EMAIL_LENGTH}
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="name@outlook.com or pilot@407.mil"
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showSignUpPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white pl-3.5 pr-11 py-2 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                        />
                        <button
                          type="button"
                          aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowSignUpPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-800"
                        >
                          {showSignUpPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-confirm-password"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Confirm Password
                      </label>
                      <input
                        id="signup-confirm-password"
                        type={showSignUpPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-1 w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                    >
                      <span>{loading ? 'Creating Account...' : 'Create Pilot Account'}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </form>

                  <div className="relative my-4 flex items-center">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="mx-3 text-xs font-medium text-slate-500">or</span>
                    <div className="flex-grow border-t border-slate-200" />
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setFormError(null);
                      setLocalInfo(null);
                      void onGoogleSignIn();
                    }}
                    className="w-full min-h-[46px] inline-flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M21.35 11.1h-9.18v2.92h5.27c-.23 1.47-1.69 4.31-5.27 4.31-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.01.77 3.7 1.43l2.52-2.44C16.77 4.1 14.68 3.2 12.17 3.2 7.21 3.2 3.2 7.21 3.2 12.48s4.01 9.28 8.97 9.28c5.18 0 8.61-3.64 8.61-8.77 0-.59-.07-1.26-.18-1.89z"
                      />
                    </svg>
                    <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
                  </button>
                </>
              )}

              <div className="mt-6 pt-5 border-t border-slate-200 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Role-based access control enforces separate views for Pilots, CO, GOO, Comd, and
                    Admins.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Offline-capable PWA caches pre-flight ORMs locally and auto-syncs to Cloud
                    Firestore upon reconnection.
                  </span>
                </div>
              </div>
            </>
          )}

          {mode === 'verify-email' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                  <MailCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Step 1 of 2 · Email Ownership</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Verify Your Email Address
                  </h2>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                We sent a verification link to{' '}
                <strong className="text-slate-900 break-all">{authEmail}</strong>. Open that link to
                confirm your email account, then continue below to submit your profile for 407 ACTG
                Admin verification.
              </p>

              <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                Didn&apos;t see the message? Check your Spam or Junk folder, or resend a fresh link
                below. Database access remains strictly locked until email verification completes.
              </div>

              {activeError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-[#C62828]/30 bg-[#C62828]/8 px-4 py-3 text-sm text-[#C62828]"
                >
                  {activeError}
                </div>
              )}

              {activeInfo && (
                <div
                  role="status"
                  className="mt-4 rounded-lg border border-[#2E7D32]/30 bg-[#2E7D32]/8 px-4 py-3 text-sm text-[#1B5E20]"
                >
                  {activeInfo}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => void onCheckEmailVerification()}
                className="mt-6 w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>{loading ? 'Checking Verification...' : "I've Verified My Email — Continue"}</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void onResendVerificationEmail()}
                className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                <span>Resend Verification Email</span>
              </button>

              <button
                type="button"
                onClick={() => void onSignOut()}
                className="mt-2.5 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Sign Out &amp; Use Another Email</span>
              </button>
            </div>
          )}

          {mode === 'register' && (
            <form onSubmit={(e) => void handleRegisterSubmit(e)} noValidate>
              <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
                Complete Pilot Registration
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Signed in as <span className="font-medium text-slate-900 break-all">{authEmail}</span>.
                Confirm your flightline profile to request Admin verification.
              </p>

              {activeError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-[#C62828]/30 bg-[#C62828]/8 px-4 py-3 text-sm text-[#C62828]"
                >
                  {activeError}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="reg-display-name"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="reg-display-name"
                    type="text"
                    required
                    maxLength={MAX_DISPLAY_NAME_LENGTH}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Capt Sofia Reyes"
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-rank-callsign"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Rank / Callsign
                  </label>
                  <input
                    id="reg-rank-callsign"
                    type="text"
                    required
                    maxLength={MAX_RANK_CALLSIGN_LENGTH}
                    value={rankCallsign}
                    onChange={(e) => setRankCallsign(e.target.value)}
                    placeholder="e.g. Capt / ATLAS 41"
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                <span>{loading ? 'Submitting Registration...' : 'Submit for Admin Verification'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => void onSignOut()}
                className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

