import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThirtyDayRiskTrend } from './riskTrend';

test('buildThirtyDayRiskTrend always produces a contiguous 30-day timeline ending on reference date', () => {
  const result = buildThirtyDayRiskTrend([], '2026-11-22');
  assert.equal(result.points.length, 30);
  assert.equal(result.points[0].date, '2026-10-24');
  assert.equal(result.points[29].date, '2026-11-22');
  assert.equal(result.totalMissions, 0);
  assert.equal(result.activeDays, 0);
  assert.equal(result.overallAverage, null);
  assert.equal(result.peakDailyAverage, null);
  assert.equal(result.trendDelta, null);
});

test('buildThirtyDayRiskTrend computes daily averages, max scores, and excludes out-of-window missions', () => {
  const submissions = [
    // Outside window (31 days before 2026-11-22 -> 2026-10-22)
    { sortieDate: '2026-10-22', submittedAt: '2026-10-22T08:00:00Z', totalScore: 20 },
    // Future date outside past 30-day window
    { sortieDate: '2026-11-25', submittedAt: '2026-11-22T08:00:00Z', totalScore: 18 },
    // In window: Nov 10 (two missions: 4 and 8 -> avg 6.0, max 8)
    { sortieDate: '2026-11-10', submittedAt: '2026-11-10T07:00:00Z', totalScore: 4 },
    { sortieDate: '2026-11-10', submittedAt: '2026-11-10T11:00:00Z', totalScore: 8 },
    // In window: Nov 22 (three missions: 3, 10, 17 -> avg 10.0, max 17)
    { sortieDate: '2026-11-22', submittedAt: '2026-11-22T06:00:00Z', totalScore: 3 },
    { sortieDate: '2026-11-22', submittedAt: '2026-11-22T09:00:00Z', totalScore: 10 },
    { sortieDate: '2026-11-22', submittedAt: '2026-11-22T12:00:00Z', totalScore: 17 },
  ];

  const result = buildThirtyDayRiskTrend(submissions, '2026-11-22');
  assert.equal(result.totalMissions, 5);
  assert.equal(result.activeDays, 2);
  assert.equal(result.overallAverage, 8.4); // (4+8+3+10+17)/5 = 42/5 = 8.4
  assert.equal(result.overallRiskLevel, 'MODERATE');
  assert.equal(result.peakDailyAverage, 10);

  const nov10 = result.points.find((p) => p.date === '2026-11-10')!;
  assert.equal(nov10.averageScore, 6);
  assert.equal(nov10.maxScore, 8);
  assert.equal(nov10.missionCount, 2);
  assert.equal(nov10.elevatedCount, 1);
  assert.equal(nov10.riskLevel, 'MODERATE');

  const nov15 = result.points.find((p) => p.date === '2026-11-15')!;
  assert.equal(nov15.averageScore, null);
  assert.equal(nov15.missionCount, 0);

  const nov22 = result.points.find((p) => p.date === '2026-11-22')!;
  assert.equal(nov22.averageScore, 10);
  assert.equal(nov22.maxScore, 17);
  assert.equal(nov22.missionCount, 3);
  assert.equal(nov22.elevatedCount, 2);
  // Prior 7 days (Nov 9-15) avg = 6.0, Last 7 days (Nov 16-22) avg = 10.0 -> delta = +4.0
  assert.equal(result.trendDelta, 4);
});
