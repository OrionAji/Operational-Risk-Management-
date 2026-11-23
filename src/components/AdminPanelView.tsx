import React, { useState } from 'react';
import { ShieldCheck, UserCheck, UserX } from 'lucide-react';
import type { AccountStatus, CommandRole, UserRoleProfile } from '../types/orm';

interface AdminPanelViewProps {
  currentUser: UserRoleProfile;
  users: UserRoleProfile[];
  onUpdateUser: (
    target: UserRoleProfile,
    updates: { status: AccountStatus; commandRole: CommandRole; isAdmin: boolean }
  ) => Promise<void>;
}

const COMMAND_ROLES: CommandRole[] = ['Pilot', 'CO', 'GOO', 'Comd'];

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  users,
  onUpdateUser,
}) => {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingUsers = users.filter((u) => u.status === 'Pending');
  const activeAndSuspended = users.filter((u) => u.status !== 'Pending');

  const handleSave = async (
    target: UserRoleProfile,
    updates: { status: AccountStatus; commandRole: CommandRole; isAdmin: boolean },
    successLabel: string
  ) => {
    setBusyUid(target.uid);
    setFeedback(null);
    try {
      await onUpdateUser(target, updates);
      setFeedback(successLabel);
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-none">
          Admin User Verification & Roles
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Verify newly registered pilots before granting database access and assign Command
          authorities (Pilot, CO, GOO, Comd).
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-[#2E7D32]/30 bg-[#2E7D32]/8 px-4 py-3 text-sm font-medium text-[#2E7D32] flex items-center justify-between gap-4"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Pilot Verification Queue */}
      <section aria-labelledby="pending-verifications-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="pending-verifications-heading"
            className="font-display text-2xl font-bold text-slate-900"
          >
            Pending Pilot Verifications ({pendingUsers.length})
          </h2>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
            No pending self-registrations waiting for verification.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
            {pendingUsers.map((u) => (
              <div
                key={u.uid}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-base text-slate-900">{u.displayName}</span>
                    <span className="font-mono-data text-xs text-slate-500">{u.rankCallsign}</span>
                    <span className="text-xs font-semibold text-[#B45309]">· Pending</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Registered {new Date(u.createdAt).toLocaleString()} · Locked from all ORM data
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyUid === u.uid}
                    onClick={() =>
                      void handleSave(
                        u,
                        { status: 'Verified', commandRole: 'Pilot', isAdmin: false },
                        `Verified and activated ${u.displayName} as Flying Pilot.`
                      )
                    }
                    className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2E7D32] text-white text-xs font-semibold hover:bg-[#1B5E20] disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    <UserCheck className="w-4 h-4" aria-hidden="true" />
                    <span>Verify & Activate</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyUid === u.uid}
                    onClick={() =>
                      void handleSave(
                        u,
                        { status: 'Suspended', commandRole: 'Pilot', isAdmin: false },
                        `Suspended registration for ${u.displayName}.`
                      )
                    }
                    className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    <UserX className="w-4 h-4" aria-hidden="true" />
                    <span>Suspend</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Personnel & Command Role Assignments */}
      <section aria-labelledby="personnel-roster-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <h2 id="personnel-roster-heading" className="font-display text-2xl font-bold text-slate-900">
            Unit Personnel & Command Authorities ({activeAndSuspended.length})
          </h2>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="py-3 px-4 font-semibold">Pilot / Personnel</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Command Role</th>
                <th className="py-3 px-4 font-semibold">Admin Access</th>
                <th className="py-3 px-4 font-semibold text-right">Account Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeAndSuspended.map((u) => {
                const isSelf = u.uid === currentUser.uid;
                return (
                  <tr key={u.uid} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {u.displayName} {isSelf && <span className="text-xs text-slate-500">(You)</span>}
                      </div>
                      <div className="font-mono-data text-xs text-slate-500">{u.rankCallsign}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: u.status === 'Verified' ? '#2E7D32' : '#C62828' }}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <label htmlFor={`role-select-${u.uid}`} className="sr-only">
                        Command role for {u.displayName}
                      </label>
                      <select
                        id={`role-select-${u.uid}`}
                        disabled={busyUid === u.uid}
                        value={u.commandRole}
                        onChange={(e) =>
                          void handleSave(
                            u,
                            {
                              status: u.status,
                              commandRole: e.target.value as CommandRole,
                              isAdmin: u.isAdmin,
                            },
                            `Updated ${u.displayName}'s Command Role to ${e.target.value}.`
                          )
                        }
                        className="min-h-[38px] rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-[#0F172A] focus:outline-none"
                      >
                        {COMMAND_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={busyUid === u.uid || isSelf}
                        onClick={() =>
                          void handleSave(
                            u,
                            {
                              status: u.status,
                              commandRole: u.commandRole,
                              isAdmin: !u.isAdmin,
                            },
                            `${!u.isAdmin ? 'Granted' : 'Revoked'} Admin privileges for ${u.displayName}.`
                          )
                        }
                        className={`min-h-[36px] px-3 py-1 rounded-md border text-xs font-semibold transition-colors disabled:opacity-50 ${
                          u.isAdmin
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {u.isAdmin ? 'Admin Enabled' : 'Standard'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          disabled={busyUid === u.uid}
                          onClick={() =>
                            void handleSave(
                              u,
                              {
                                status: u.status === 'Verified' ? 'Suspended' : 'Verified',
                                commandRole: u.commandRole,
                                isAdmin: u.isAdmin,
                              },
                              `${u.status === 'Verified' ? 'Suspended' : 'Reactivated'} ${u.displayName}.`
                            )
                          }
                          className="min-h-[36px] px-3 py-1 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {u.status === 'Verified' ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
