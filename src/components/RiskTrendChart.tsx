import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { OrmSubmission, RiskLevel, ThemePreference } from '../types/orm';
import { RISK_TIER_CONFIG } from '../utils/ormScoring';
import { buildThirtyDayRiskTrend, type DailyRiskTrendPoint } from '../utils/riskTrend';

interface RiskTrendChartProps {
  submissions: OrmSubmission[];
  theme?: ThemePreference;
}

const DARK_TIER_TEXT_COLOR: Record<RiskLevel, string> = {
  LOW: '#66BB6A',
  MODERATE: '#FBBF24',
  HIGH: '#FB923C',
  SEVERE: '#F87171',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DailyRiskTrendPoint }>;
  isDark: boolean;
}

const TrendTooltip: React.FC<CustomTooltipProps> = ({ active, payload, isDark }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const tier = point.riskLevel ? RISK_TIER_CONFIG[point.riskLevel] : null;
  const tierColor = point.riskLevel
    ? isDark
      ? DARK_TIER_TEXT_COLOR[point.riskLevel]
      : RISK_TIER_CONFIG[point.riskLevel].colorHex
    : undefined;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-md text-xs">
      <div className="font-mono-data font-semibold text-slate-900 dark:text-slate-100">{point.date}</div>
      {point.averageScore !== null && tier ? (
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Avg Risk Score</span>
            <span className="font-mono-data font-bold" style={{ color: tierColor }}>
              {point.averageScore.toFixed(1)} pts
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Avg Band</span>
            <span className="font-semibold" style={{ color: tierColor }}>
              {tier.shortLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Sorties Logged</span>
            <span className="font-mono-data font-medium text-slate-800 dark:text-slate-200">{point.missionCount}</span>
          </div>
          {point.maxScore !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Peak Mission</span>
              <span className="font-mono-data font-medium text-slate-800 dark:text-slate-200">
                {point.maxScore} pts
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-1 text-slate-500 dark:text-slate-400">No flight ORMs logged</p>
      )}
    </div>
  );
};

interface RiskDotProps {
  cx?: number;
  cy?: number;
  payload?: DailyRiskTrendPoint;
}

const makeRiskColoredDotRenderer = (strokeColor: string) => (props: RiskDotProps) => {
  const { cx, cy, payload } = props;
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    !payload ||
    payload.averageScore === null ||
    !payload.riskLevel
  ) {
    return null;
  }
  const color = RISK_TIER_CONFIG[payload.riskLevel].colorHex;
  return (
    <circle
      key={`dot-${payload.date}`}
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke={strokeColor}
      strokeWidth={1.5}
    />
  );
};

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({
  submissions,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const trend = useMemo(() => buildThirtyDayRiskTrend(submissions), [submissions]);

  const yAxisMax = useMemo(() => {
    const peak = trend.peakDailyAverage ?? 16;
    return Math.max(18, Math.ceil((peak + 2) / 2) * 2);
  }, [trend.peakDailyAverage]);

  const overallTier = trend.overallRiskLevel ? RISK_TIER_CONFIG[trend.overallRiskLevel] : null;
  const dotRenderer = useMemo(
    () => makeRiskColoredDotRenderer(isDark ? '#0F172A' : '#FFFFFF'),
    [isDark]
  );

  return (
    <section
      aria-labelledby="risk-trend-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2
            id="risk-trend-heading"
            className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          >
            30-Day Historical Risk Trend
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Daily average mission ORM score across the past 30 days
          </p>
        </div>

        {trend.totalMissions > 0 && trend.overallAverage !== null && overallTier && trend.overallRiskLevel && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            <span>
              30-Day Avg:{' '}
              <strong
                className="font-mono-data font-bold"
                style={{
                  color: isDark
                    ? DARK_TIER_TEXT_COLOR[trend.overallRiskLevel]
                    : overallTier.colorHex,
                }}
              >
                {trend.overallAverage.toFixed(1)} pts ({overallTier.shortLabel})
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="font-mono-data">
              {trend.totalMissions} {trend.totalMissions === 1 ? 'mission' : 'missions'} across{' '}
              {trend.activeDays} {trend.activeDays === 1 ? 'day' : 'days'}
            </span>
            {trend.trendDelta !== null && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <span
                  className="inline-flex items-center gap-1 font-mono-data font-semibold"
                  style={{
                    color:
                      trend.trendDelta > 0
                        ? isDark
                          ? '#F87171'
                          : '#C62828'
                        : trend.trendDelta < 0
                          ? isDark
                            ? '#66BB6A'
                            : '#2E7D32'
                          : isDark
                            ? '#94A3B8'
                            : '#475569',
                  }}
                >
                  {trend.trendDelta > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : trend.trendDelta < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : null}
                  <span>
                    7d {trend.trendDelta > 0 ? '+' : ''}
                    {trend.trendDelta.toFixed(1)} pts
                  </span>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {trend.totalMissions === 0 ? (
        <div className="py-12 text-center">
          <p className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            No Missions Logged in the Past 30 Days
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Daily average mission risk scores will plot here automatically as pilots submit
            pre-flight ORMs.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 h-[260px] w-full" data-testid="risk-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend.points}
                margin={{ top: 12, right: 72, left: -12, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? '#1E293B' : '#E2E8F0'}
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 11,
                    fill: isDark ? '#94A3B8' : '#64748B',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? '#334155' : '#CBD5E1' }}
                  minTickGap={24}
                />
                <YAxis
                  domain={[0, yAxisMax]}
                  tick={{
                    fontSize: 11,
                    fill: isDark ? '#94A3B8' : '#64748B',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<TrendTooltip isDark={isDark} />} />

                {/* MDA Risk Threshold Reference Lines */}
                <ReferenceLine
                  y={6}
                  stroke="#F57F17"
                  strokeDasharray="4 4"
                  strokeOpacity={0.75}
                  label={{
                    value: 'CO (6)',
                    position: 'right',
                    fill: isDark ? '#FBBF24' : '#B45309',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                <ReferenceLine
                  y={13}
                  stroke="#E65100"
                  strokeDasharray="4 4"
                  strokeOpacity={0.75}
                  label={{
                    value: 'GOO (13)',
                    position: 'right',
                    fill: isDark ? '#FB923C' : '#C2410C',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                <ReferenceLine
                  y={16}
                  stroke="#C62828"
                  strokeDasharray="4 4"
                  strokeOpacity={0.75}
                  label={{
                    value: 'Comd (16)',
                    position: 'right',
                    fill: isDark ? '#F87171' : '#B91C1C',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="averageScore"
                  name="Average Risk Score"
                  stroke={isDark ? '#E2E8F0' : '#0F172A'}
                  strokeWidth={2.25}
                  connectNulls
                  dot={dotRenderer}
                  activeDot={{
                    r: 6,
                    fill: isDark ? '#F8FAFC' : '#0F172A',
                    stroke: isDark ? '#0F172A' : '#FFFFFF',
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" aria-hidden="true" />
                <span>Low (0–5)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F57F17]" aria-hidden="true" />
                <span>Moderate (6–12)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E65100]" aria-hidden="true" />
                <span>High (13–15)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C62828]" aria-hidden="true" />
                <span>Severe (16+)</span>
              </span>
            </div>
            <span className="font-mono-data text-slate-400 dark:text-slate-500">
              Dashed lines indicate MDA escalation thresholds
            </span>
          </div>
        </>
      )}
    </section>
  );
};
