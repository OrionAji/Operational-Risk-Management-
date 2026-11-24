import React, { useMemo, useState } from 'react';
import { ChevronRight, Search, ShieldAlert, History } from 'lucide-react';
import type {
  AuditLogEntry,
  OrmSubmission,
  RiskLevel,
  ThemePreference,
  UserRoleProfile,
} from '../types/orm';
import {
  canUserApproveOrm,
  getTodayIsoDate,
  isPendingOrmStatus,
} from '../utils/ormScoring';
import { OrmStatusText, RiskTierBadge } from './RiskVisuals';
import { RiskTrendChart } from './RiskTrendChart';

interface CommandQueueViewProps {
  user: UserRoleProfile;
  submissions: OrmSubmission[];
  auditLogs: AuditLogEntry[];
  onInspectOrm: (orm: OrmSubmission) => void;
  theme: ThemePreference;
}

export const CommandQueueView: React.FC<CommandQueueViewProps> = ({
  user,
  submissions,
  auditLogs,
  onInspectOrm,
  theme,
}) => {
  const [queueFilter, setQueueFilter] = useState<'actionable' | 'pending' | 'all'>('pending');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const today = getTodayIsoDate();

  const metrics = useMemo(() => {
    const pendingAll = submissions.filter((s) => isPendingOrmStatus(s.status));
    const actionableByMe = pendingAll.filter((s) => canUserApproveOrm(user, s).allowed);
    const todaySorties = submissions.filter((s) => s.sortieDate === today);
    const elevatedCount = submissions.filter((s) => s.totalScore >= 6).length;
    const highestScore = submissions.reduce((max, s) => Math.max(max, s.totalScore), 0);
    return {
      pendingTotal: pendingAll.length,
      actionableCount: actionableByMe.length,
      todayCount: todaySorties.length,
      elevatedCount,
      highestScore,
    };
  }, [submissions, today, user]);

  const filteredSubmissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return submissions.filter((s) => {
      if (queueFilter === 'pending' && !isPendingOrmStatus(s.status)) return false;
      if (queueFilter === 'actionable' && !canUserApproveOrm(user, s).allowed) return false;
      if (riskFilter !== 'ALL' && s.riskLevel !== riskFilter) return false;
      if (term) {
        const hay = `${s.pilotName} ${s.rankCallsign} ${s.missionCallsign} ${s.aircraftTail} ${s.status}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [submissions, queueFilter, riskFilter, searchTerm, user]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
            Command Sign-Off Queue
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Live 407 ACTG unit risk overview · Signed in as{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{user.commandRole}</span>
          </p>
        </div>
      </div>

      {/* Live Unit Risk Overview Strip (4 Clean KPI Cells) */}
      <section
        aria-label="Live unit risk overview"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden"
      >
        <div className="p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Sign-Offs</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono-data text-3xl font-bold text-slate-950 dark:text-slate-50">
              {metrics.pendingTotal}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {metrics.actionableCount} actionable by you
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Today&apos;s Flight ORMs</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono-data text-3xl font-bold text-slate-950 dark:text-slate-50">
              {metrics.todayCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">sorties logged</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Elevated Risk (&ge; 6 Pts)</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`font-mono-data text-3xl font-bold ${
                metrics.elevatedCount > 0
                  ? 'text-[#E65100] dark:text-[#FB923C]'
                  : 'text-[#2E7D32] dark:text-[#66BB6A]'
              }`}
            >
              {metrics.elevatedCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">MDA required</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Highest Unit Score</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`font-mono-data text-3xl font-bold ${
                metrics.highestScore >= 16
                  ? 'text-[#C62828] dark:text-[#F87171]'
                  : metrics.highestScore >= 13
                    ? 'text-[#E65100] dark:text-[#FB923C]'
                    : metrics.highestScore >= 6
                      ? 'text-[#F57F17] dark:text-[#FBBF24]'
                      : 'text-[#2E7D32] dark:text-[#66BB6A]'
              }`}
            >
              {metrics.highestScore}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">pts peak</span>
          </div>
        </div>
      </section>

      {/* 30-Day Historical Risk Trend Line Chart */}
      <RiskTrendChart submissions={submissions} theme={theme} />

      {/* Queue Controls & Mission Table */}
      <section aria-label="Mission sign-off queue" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-200/80 dark:bg-slate-800/90 self-start">
            {(
              [
                { id: 'pending', label: `All Pending (${metrics.pendingTotal})` },
                { id: 'actionable', label: `My Authority (${metrics.actionableCount})` },
                { id: 'all', label: `Unit Log (${submissions.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQueueFilter(tab.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  queueFilter === tab.id
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="command-risk-filter" className="sr-only">
              Filter by risk tier
            </label>
            <select
              id="command-risk-filter"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as 'ALL' | RiskLevel)}
              className="min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-[#0F172A] dark:focus:border-slate-400 focus:outline-none"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="SEVERE">Severe Risk (16+)</option>
              <option value="HIGH">High Risk (13–15)</option>
              <option value="MODERATE">Moderate Risk (6–12)</option>
              <option value="LOW">Low Risk (0–5)</option>
            </select>

            <div className="relative flex-1 sm:w-56">
              <Search
                className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <label htmlFor="command-search" className="sr-only">
                Search missions or pilots
              </label>
              <input
                id="command-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search callsign, pilot, tail..."
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F172A] dark:focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              No Missions Match This Filter
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              All pending ORMs within the selected authority and risk filter have been resolved.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
            {filteredSubmissions.map((orm) => {
              const approvalCheck = canUserApproveOrm(user, orm);
              const isSelf = orm.pilotId === user.uid;
              return (
                <button
                  key={orm.id}
                  type="button"
                  onClick={() => onInspectOrm(orm)}
                  className="w-full text-left px-4 sm:px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <RiskTierBadge level={orm.riskLevel} score={orm.totalScore} compact />
                      <span className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                        {orm.missionCallsign}
                      </span>
                      <span className="font-mono-data text-xs text-slate-500 dark:text-slate-400">
                        {orm.aircraftTail} · {orm.sortieDate}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{orm.pilotName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{orm.rankCallsign}</span>
                      <span aria-hidden="true">·</span>
                      <OrmStatusText status={orm.status} />
                    </div>

                    {orm.topRiskDrivers.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        Drivers: {orm.topRiskDrivers.join(' · ')}
                      </p>
                    )}

                    {isSelf && isPendingOrmStatus(orm.status) && user.commandRole !== 'Comd' && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C62828] dark:text-[#F87171]">
                        <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          Your submission — Anti-Self-Approval active (requires {orm.requiredMdaRole}{' '}
                          independent sign-off)
                        </span>
                      </div>
                    )}

                    {isSelf && isPendingOrmStatus(orm.status) && user.commandRole === 'Comd' && (
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Your submission · Commander sign-off authorized
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">MDA Authority</div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {orm.requiredMdaRole}
                        {orm.escalated ? ' (Escalated)' : ''}
                      </div>
                    </div>

                    <span
                      className={`min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        approvalCheck.allowed
                          ? 'bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950'
                          : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>{approvalCheck.allowed ? 'Review & Sign Off' : 'View Breakdown'}</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Immutable Audit Log */}
      <section aria-labelledby="audit-log-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600 dark:text-slate-400" aria-hidden="true" />
          <h2 id="audit-log-heading" className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Immutable Safety Audit Log
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Action</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Actor</th>
                <th className="py-3 px-4 font-semibold">Event Summary</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-center text-slate-500 dark:text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 25).map((entry) => {
                  const scoreColorClass =
                    entry.score <= 0
                      ? 'text-slate-500 dark:text-slate-400'
                      : entry.riskLevel === 'SEVERE'
                        ? 'text-[#C62828] dark:text-[#F87171]'
                        : entry.riskLevel === 'HIGH'
                          ? 'text-[#E65100] dark:text-[#FB923C]'
                          : entry.riskLevel === 'MODERATE'
                            ? 'text-[#F57F17] dark:text-[#FBBF24]'
                            : entry.riskLevel === 'LOW'
                              ? 'text-[#2E7D32] dark:text-[#66BB6A]'
                              : 'text-slate-600 dark:text-slate-400';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono-data text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString([], {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono-data font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {entry.action}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {entry.actorName}{' '}
                        <span className="text-slate-500 dark:text-slate-400">({entry.actorRole})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 min-w-[240px]">{entry.summary}</td>
                      <td
                        className={`py-3 px-4 font-mono-data font-semibold text-right whitespace-nowrap ${scoreColorClass}`}
                      >
                        {entry.score > 0 ? `${entry.score} pts` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
