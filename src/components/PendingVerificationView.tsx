import React from 'react';
import { Lock, LogOut, ShieldAlert } from 'lucide-react';
import type { ThemePreference, UserRoleProfile } from '../types/orm';
import { ThemeToggleButton } from './ThemeToggleButton';

interface PendingVerificationViewProps {
  profile: UserRoleProfile;
  onSignOut: () => Promise<void>;
  theme: ThemePreference;
  onToggleTheme: () => void;
}

export const PendingVerificationView: React.FC<PendingVerificationViewProps> = ({
  profile,
  onSignOut,
  theme,
  onToggleTheme,
}) => {
  const isSuspended = profile.status === 'Suspended';

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0B1120] flex flex-col items-center justify-center p-6 transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white"
              style={{ backgroundColor: isSuspended ? '#C62828' : '#F57F17' }}
            >
              {isSuspended ? <ShieldAlert className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                407 ACTG ORM Access Control
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {isSuspended ? 'Account Access Suspended' : 'Pending Admin Verification'}
              </h1>
            </div>
          </div>
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {isSuspended
            ? 'Your 407 ACTG Operational Risk Management account has been suspended by a unit administrator. You cannot view records or submit flight ORMs until reactivated.'
            : 'Your self-registration request has been logged. For flight safety and operational security, new accounts remain locked until a 407 ACTG Admin verifies your identity and assigns your flying or command role.'}
        </p>

        <dl className="mt-6 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500 dark:text-slate-400">Registered Name</dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">{profile.displayName}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500 dark:text-slate-400">Rank / Callsign</dt>
            <dd className="font-mono-data font-medium text-slate-900 dark:text-slate-100">
              {profile.rankCallsign}
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500 dark:text-slate-400">Account Status</dt>
            <dd
              className={`font-semibold ${
                isSuspended
                  ? 'text-[#C62828] dark:text-[#F87171]'
                  : 'text-[#B45309] dark:text-[#FBBF24]'
              }`}
            >
              {profile.status}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          This screen updates automatically as soon as an Admin activates your account. No database
          records or ORM checklists are accessible while locked.
        </p>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
