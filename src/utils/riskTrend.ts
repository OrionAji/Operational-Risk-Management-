import type { OrmSubmission, RiskLevel } from '../types/orm';
import { classifyRiskLevel, getTodayIsoDate } from './ormScoring';

export interface DailyRiskTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g., "Nov 22"
  averageScore: number | null;
  maxScore: number | null;
  missionCount: number;
  elevatedCount: number;
  riskLevel: RiskLevel | null;
}

export interface RiskTrendSummary {
  points: DailyRiskTrendPoint[];
  totalMissions: number;
  activeDays: number;
  overallAverage: number | null;
  overallRiskLevel: RiskLevel | null;
  peakDailyAverage: number | null;
  trendDelta: number | null; // Last 7 days avg minus prior 7 days avg
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseIsoDateUtc(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function formatUtcIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortLabel(isoDate: string): string {
  const dt = parseIsoDateUtc(isoDate);
  return `${SHORT_MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
}

function extractSubmissionDate(
  submission: Pick<OrmSubmission, 'sortieDate' | 'submittedAt'>
): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(submission.sortieDate)) {
    return submission.sortieDate;
  }
  if (typeof submission.submittedAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(submission.submittedAt)) {
    return submission.submittedAt.slice(0, 10);
  }
  return null;
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildThirtyDayRiskTrend(
  submissions: Pick<OrmSubmission, 'sortieDate' | 'submittedAt' | 'totalScore'>[],
  referenceDateIso: string = getTodayIsoDate(),
  windowDays: number = 30
): RiskTrendSummary {
  const safeWindow = Math.max(1, Math.floor(windowDays));
  const endDate = parseIsoDateUtc(referenceDateIso);

  const orderedDates: string[] = [];
  const buckets = new Map<string, { sum: number; count: number; max: number; elevated: number }>();

  for (let offset = safeWindow - 1; offset >= 0; offset--) {
    const dt = new Date(endDate.getTime());
    dt.setUTCDate(endDate.getUTCDate() - offset);
    const iso = formatUtcIsoDate(dt);
    orderedDates.push(iso);
    buckets.set(iso, { sum: 0, count: 0, max: 0, elevated: 0 });
  }

  let totalMissions = 0;
  let totalScoreSum = 0;

  for (const sub of submissions) {
    const dateKey = extractSubmissionDate(sub);
    if (!dateKey) continue;
    const bucket = buckets.get(dateKey);
    if (!bucket) continue;
    const score = Number.isFinite(sub.totalScore) ? Math.max(0, sub.totalScore) : 0;
    bucket.sum += score;
    bucket.count += 1;
    bucket.max = Math.max(bucket.max, score);
    if (score >= 6) {
      bucket.elevated += 1;
    }
    totalMissions += 1;
    totalScoreSum += score;
  }

  let activeDays = 0;
  let peakDailyAverage: number | null = null;

  const points: DailyRiskTrendPoint[] = orderedDates.map((iso) => {
    const bucket = buckets.get(iso)!;
    if (bucket.count === 0) {
      return {
        date: iso,
        label: formatShortLabel(iso),
        averageScore: null,
        maxScore: null,
        missionCount: 0,
        elevatedCount: 0,
        riskLevel: null,
      };
    }

    activeDays += 1;
    const avg = roundToTenth(bucket.sum / bucket.count);
    peakDailyAverage = peakDailyAverage === null ? avg : Math.max(peakDailyAverage, avg);

    return {
      date: iso,
      label: formatShortLabel(iso),
      averageScore: avg,
      maxScore: bucket.max,
      missionCount: bucket.count,
      elevatedCount: bucket.elevated,
      riskLevel: classifyRiskLevel(Math.round(avg)),
    };
  });

  const overallAverage = totalMissions > 0 ? roundToTenth(totalScoreSum / totalMissions) : null;
  const overallRiskLevel =
    overallAverage !== null ? classifyRiskLevel(Math.round(overallAverage)) : null;

  // Compute 7-day rolling delta (last 7 days mission-weighted average vs prior 7 days)
  let trendDelta: number | null = null;
  if (orderedDates.length >= 14) {
    const recentDates = orderedDates.slice(-7);
    const priorDates = orderedDates.slice(-14, -7);

    let recentSum = 0;
    let recentCount = 0;
    for (const d of recentDates) {
      const b = buckets.get(d)!;
      recentSum += b.sum;
      recentCount += b.count;
    }

    let priorSum = 0;
    let priorCount = 0;
    for (const d of priorDates) {
      const b = buckets.get(d)!;
      priorSum += b.sum;
      priorCount += b.count;
    }

    if (recentCount > 0 && priorCount > 0) {
      trendDelta = roundToTenth(recentSum / recentCount - priorSum / priorCount);
    }
  }

  return {
    points,
    totalMissions,
    activeDays,
    overallAverage,
    overallRiskLevel,
    peakDailyAverage,
    trendDelta,
  };
}
