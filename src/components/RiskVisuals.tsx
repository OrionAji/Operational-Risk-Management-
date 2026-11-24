import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { OrmStatus, RiskLevel } from '../types/orm';
import { RISK_TIER_CONFIG } from '../utils/ormScoring';

export const RiskTierIcon: React.FC<{ level: RiskLevel; className?: string }> = ({
  level,
  className = 'w-4 h-4',
}) => {
  switch (level) {
    case 'LOW':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'MODERATE':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'HIGH':
      return <AlertCircle className={className} aria-hidden="true" />;
    case 'SEVERE':
      return <ShieldAlert className={className} aria-hidden="true" />;
  }
};

export function getRiskBannerTextColor(level: RiskLevel): string {
  return level === 'MODERATE' ? '#0F172A' : '#FFFFFF';
}

export const RiskTierBadge: React.FC<{
  level: RiskLevel;
  score?: number;
  compact?: boolean;
}> = ({ level, score, compact = false }) => {
  const meta = RISK_TIER_CONFIG[level];
  const fgColor = getRiskBannerTextColor(level);
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold whitespace-nowrap shrink-0 rounded-md ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
      style={{ backgroundColor: meta.colorHex, color: fgColor }}
    >
      <RiskTierIcon level={level} className="w-3.5 h-3.5 shrink-0" />
      <span>{meta.label}</span>
      {typeof score === 'number' && (
        <span className="font-mono-data font-bold opacity-95">· {score} pts</span>
      )}
    </span>
  );
};

export const RiskScoreMeter: React.FC<{ score: number; level: RiskLevel }> = ({ score, level }) => {
  const meta = RISK_TIER_CONFIG[level];
  // Cap meter visual fill at 24 pts for clear 4-tier readability
  const pct = Math.min(100, Math.round((score / 24) * 100));
  return (
    <div className="w-full" aria-label={`Risk score meter: ${score} points, ${meta.label}`}>
      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${Math.max(pct, score > 0 ? 6 : 2)}%`, backgroundColor: meta.colorHex }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
        <span className="text-[#2E7D32] dark:text-[#66BB6A] font-medium">0–5 Low</span>
        <span className="text-[#B45309] dark:text-[#FBBF24] font-medium">6–12 Mod</span>
        <span className="text-[#E65100] dark:text-[#FB923C] font-medium">13–15 High</span>
        <span className="text-[#C62828] dark:text-[#F87171] font-medium">16+ Severe</span>
      </div>
    </div>
  );
};

export const OrmStatusText: React.FC<{ status: OrmStatus }> = ({ status }) => {
  let colorClass = 'text-slate-700 dark:text-slate-300';
  if (status === 'CLEARED' || status === 'APPROVED') colorClass = 'text-[#2E7D32] dark:text-[#66BB6A]';
  else if (status === 'PENDING CO SIGN-OFF') colorClass = 'text-[#B45309] dark:text-[#FBBF24]';
  else if (status === 'PENDING GOO SIGN-OFF') colorClass = 'text-[#E65100] dark:text-[#FB923C]';
  else if (status === 'PENDING COMD SIGN-OFF' || status === 'REJECTED')
    colorClass = 'text-[#C62828] dark:text-[#F87171]';

  return <span className={`font-semibold text-xs tracking-wide ${colorClass}`}>{status}</span>;
};
