import React from 'react';
import { Lock, LogOut, ShieldAlert } from 'lucide-react';
import type { UserRoleProfile } from '../types/orm';

interface PendingVerificationViewProps {
  profile: UserRoleProfile;
  onSignOut: () => Promise<void>;
}

export const PendingVerificationView: React.FC<PendingVerificationViewProps> = ({
  profile,
  onSignOut,
}) => {
  const isSuspended = profile.status === 'Suspended';

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: isSuspended ? '#C62828' : '#F57F17' }}
          >
            {isSuspended ? <ShieldAlert className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">407 ACTG ORM Access Control</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isSuspended ? 'Account Access Suspended' : 'Pending Admin Verification'}
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          {isSuspended
            ? 'Your 407 ACTG Operational Risk Management account has been suspended by a unit administrator. You cannot view records or submit flight ORMs until reactivated.'
            : 'Your self-registration request has been logged. For flight safety and operational security, new accounts remain locked until a 407 ACTG Admin verifies your identity and assigns your flying or command role.'}
        </p>

        <dl className="mt-6 rounded-lg bg-slate-50 border border-slate-200 divide-y divide-slate-200 text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500">Registered Name</dt>
            <dd className="font-semibold text-slate-900">{profile.displayName}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500">Rank / Callsign</dt>
            <dd className="font-mono-data font-medium text-slate-900">{profile.rankCallsign}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500">Account Status</dt>
            <dd
              className="font-semibold"
              style={{ color: isSuspended ? '#C62828' : '#B45309' }}
            >
              {profile.status}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-xs text-slate-500 leading-relaxed">
          This screen updates automatically as soon as an Admin activates your account. No database
          records or ORM checklists are accessible while locked.
        </p>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
