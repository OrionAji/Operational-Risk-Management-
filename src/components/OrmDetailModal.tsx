import React, { useState } from 'react';
import { CheckCircle2, XCircle, X, Lock, ShieldAlert, FileText } from 'lucide-react';
import { ORM_SECTIONS } from '../data/ormChecklist';
import type { OrmSubmission, UserRoleProfile } from '../types/orm';
import { canUserApproveOrm, RISK_TIER_CONFIG, ROLE_FULL_LABELS } from '../utils/ormScoring';
import { getRiskBannerTextColor, OrmStatusText, RiskTierBadge, RiskTierIcon } from './RiskVisuals';

interface OrmDetailModalProps {
  orm: OrmSubmission | null;
  currentUser: UserRoleProfile;
  onClose: () => void;
  onDecision?: (
    orm: OrmSubmission,
    decision: 'APPROVED' | 'REJECTED',
    commandRemarks: string
  ) => Promise<void>;
}

export const OrmDetailModal: React.FC<OrmDetailModalProps> = ({
  orm,
  currentUser,
  onClose,
  onDecision,
}) => {
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!orm) return null;

  const riskMeta = RISK_TIER_CONFIG[orm.riskLevel];
  const bannerTextColor = getRiskBannerTextColor(orm.riskLevel);
  const approvalCheck = canUserApproveOrm(currentUser, orm);
  const isPending =
    orm.status === 'PENDING CO SIGN-OFF' ||
    orm.status === 'PENDING GOO SIGN-OFF' ||
    orm.status === 'PENDING COMD SIGN-OFF';

  const handleAction = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!onDecision) return;
    setError(null);
    if (decision === 'REJECTED' && !remarks.trim()) {
      setError('Enter Command Mitigation / Hold remarks explaining why this mission is rejected or held.');
      return;
    }
    setSubmitting(decision);
    try {
      await onDecision(orm, decision, remarks.trim());
      setRemarks('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record command decision.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/75 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orm-detail-title"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Color-Coded Risk Banner Header */}
        <div
          className="px-5 py-4 flex items-center justify-between gap-4 shrink-0"
          style={{ backgroundColor: riskMeta.colorHex, color: bannerTextColor }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <RiskTierIcon level={orm.riskLevel} className="w-6 h-6 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="orm-detail-title"
                  className="font-display text-2xl font-bold tracking-tight leading-none"
                >
                  {orm.missionCallsign} · {orm.aircraftTail}
                </h2>
                <span className="font-mono-data text-sm font-bold opacity-95">
                  {orm.totalScore} PTS ({riskMeta.label})
                </span>
              </div>
              <p className="text-xs opacity-90 mt-1 truncate font-medium">
                {orm.pilotName} · {orm.rankCallsign} · Sortie {orm.sortieDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission ORM breakdown"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg bg-black/15 hover:bg-black/25 shrink-0 transition-colors"
            style={{ color: bannerTextColor }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Breakdown Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status & MDA Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 text-sm">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Current Mission Status</div>
              <div className="mt-1">
                <OrmStatusText status={orm.status} />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Required Approver (MDA)</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {ROLE_FULL_LABELS[orm.requiredMdaRole]}
              </div>
              {orm.escalated && (
                <div className="mt-0.5 text-xs text-[#C2410C] dark:text-[#FB923C] font-medium">
                  Auto-escalated (Anti-Self-Approval)
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Submitted Timestamp</div>
              <div className="mt-1 font-mono-data text-xs text-slate-800 dark:text-slate-200">
                {new Date(orm.submittedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Top Risk Drivers */}
          {orm.topRiskDrivers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Top Risk Drivers</h3>
              <ul className="space-y-1.5 text-sm text-slate-800 dark:text-slate-200">
                {orm.topRiskDrivers.map((driver, idx) => (
                  <li key={idx} className="flex items-center gap-2 font-medium">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: riskMeta.colorHex }}
                      aria-hidden="true"
                    />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pilot Mitigation Notes */}
          {orm.mitigationNotes && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pilot Mitigation Notes / Remarks</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {orm.mitigationNotes}
              </p>
            </div>
          )}

          {/* Recorded Command Decision (if already decided) */}
          {(orm.status === 'APPROVED' || orm.status === 'REJECTED') && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Command Sign-Off · {orm.decisionByName} ({orm.decisionByRole})
                </div>
                {orm.decidedAt && (
                  <span className="font-mono-data text-xs text-slate-500 dark:text-slate-400">
                    {new Date(orm.decidedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {orm.commandRemarks || 'No additional command remarks recorded.'}
              </p>
            </div>
          )}

          {/* Full 16-Item Breakdown by Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Full 16-Item ORM Breakdown
              </h3>
              <RiskTierBadge level={orm.riskLevel} score={orm.totalScore} compact />
            </div>

            {ORM_SECTIONS.map((sec) => {
              const items = orm.itemizedBreakdown.filter((b) => b.section === sec.id);
              const secTotal = items.reduce((sum, item) => sum + item.points, 0);
              return (
                <div key={sec.id} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {sec.code}: {sec.title}
                    </span>
                    <span className="font-mono-data text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Subtotal: {secTotal} pts
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                      <div
                        key={item.itemId}
                        className={`px-4 py-2.5 flex items-center justify-between gap-4 text-sm ${
                          item.points > 0
                            ? 'bg-amber-50/35 dark:bg-amber-950/25'
                            : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono-data text-xs text-slate-400 dark:text-slate-500 mr-2">
                            {String(item.itemNumber).padStart(2, '0')}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                          <span className="text-slate-400 dark:text-slate-600 mx-1.5">·</span>
                          <span className="text-slate-600 dark:text-slate-300">{item.choiceLabel}</span>
                        </div>
                        <span
                          className={`font-mono-data text-xs font-semibold whitespace-nowrap shrink-0 ${
                            item.points >= 4
                              ? 'text-[#C62828] dark:text-[#F87171]'
                              : item.points >= 2
                                ? 'text-[#E65100] dark:text-[#FB923C]'
                                : item.points > 0
                                  ? 'text-[#B45309] dark:text-[#FBBF24]'
                                  : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          +{item.points} pt{item.points === 1 ? '' : 's'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Command Sign-Off Action Panel (only when pending and handler provided) */}
          {isPending && onDecision && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              {approvalCheck.allowed ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="command-mitigation-remarks"
                      className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                    >
                      Command Mitigation / Approval Remarks
                    </label>
                    <textarea
                      id="command-mitigation-remarks"
                      rows={3}
                      maxLength={2000}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter required command mitigations, weather/fuel gates, or reason for hold/rejection..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F172A] dark:focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15 dark:focus:ring-slate-400/20"
                    />
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-lg border border-[#C62828]/30 dark:border-red-500/40 bg-[#C62828]/8 dark:bg-red-950/45 px-4 py-2.5 text-xs font-medium text-[#C62828] dark:text-red-300"
                    >
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => void handleAction('APPROVED')}
                      className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#2E7D32] px-5 py-3 text-sm font-bold text-white hover:bg-[#1B5E20] disabled:opacity-60 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {submitting === 'APPROVED' ? 'Recording Approval...' : 'APPROVE MISSION'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => void handleAction('REJECTED')}
                      className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#C62828] px-5 py-3 text-sm font-bold text-white hover:bg-[#991B1B] disabled:opacity-60 transition-colors"
                    >
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {submitting === 'REJECTED' ? 'Recording Hold...' : 'REJECT / HOLD'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-300 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
                  {orm.pilotId === currentUser.uid ? (
                    <ShieldAlert className="w-5 h-5 text-[#C62828] dark:text-[#F87171] shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-5 h-5 text-[#B45309] dark:text-[#FBBF24] shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm text-slate-800 dark:text-slate-200">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Sign-Off Locked</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{approvalCheck.reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
