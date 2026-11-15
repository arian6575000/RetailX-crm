import assert from 'node:assert/strict';
import { Rows, dashboardStats, monthlyCounts, monthlyWonValue, stageBreakdown, winRate, sourceBreakdown, activityMix, followUpCompletion, statusBreakdown } from '../src/lib/analytics';

const NOW = new Date(2026, 10, 15, 12, 0).getTime(); // 15 Nov 2026, noon
const day = (d: number, h = 10) => new Date(2026, 10, d, h).getTime();
const rows: Rows = {
  customers: [
    { id: 1, status: 'vip', groupId: null, createdAt: day(2) },
    { id: 2, status: 'active', groupId: null, createdAt: day(14) },
    { id: 3, status: 'inactive', groupId: null, createdAt: new Date(2026, 8, 5).getTime() },
  ],
  leads: [
    { id: 1, stage: 'new', value: 1000, source: 'walk-in', createdAt: day(1), closedAt: null },
    { id: 2, stage: 'negotiation', value: 2000, source: 'referral', createdAt: day(1), closedAt: null },
    { id: 3, stage: 'won', value: 5000, source: 'referral', createdAt: day(1), closedAt: day(10) },
    { id: 4, stage: 'won', value: 700, source: 'whatsapp', createdAt: day(1), closedAt: new Date(2026, 9, 20).getTime() },
    { id: 5, stage: 'lost', value: 300, source: 'walk-in', createdAt: day(1), closedAt: day(11) },
  ],
  activities: [
    { id: 1, type: 'call', at: day(14), amount: 0 }, { id: 2, type: 'call', at: day(13), amount: 0 },
    { id: 3, type: 'visit', at: day(1), amount: 0 }, { id: 4, type: 'call', at: new Date(2026, 5, 1).getTime(), amount: 0 },
  ],
  followups: [
    { id: 1, dueAt: day(10), done: false, doneAt: null, priority: 'high' }, // overdue
    { id: 2, dueAt: day(15, 18), done: false, doneAt: null, priority: 'low' }, // today
    { id: 3, dueAt: day(17), done: false, doneAt: null, priority: 'low' }, // upcoming
    { id: 4, dueAt: day(12), done: true, doneAt: day(12), priority: 'low' },
    { id: 5, dueAt: day(30), done: false, doneAt: null, priority: 'low' }, // beyond 7 days
  ],
};

const s = dashboardStats(rows, NOW);
assert.equal(s.totalCustomers, 3); assert.equal(s.newThisMonth, 2); assert.equal(s.vip, 1);
assert.equal(s.openLeads, 2); assert.equal(s.pipelineValue, 3000);
assert.equal(s.weightedValue, 100 + 1600, 'new 10% of 1000 + negotiation 80% of 2000');
assert.equal(s.wonCountMonth, 1); assert.equal(s.wonValueMonth, 5000, 'won in an earlier month is excluded');
assert.equal(s.overdue, 1); assert.equal(s.dueToday, 1); assert.equal(s.upcoming7, 1);

const m = monthlyCounts(rows.customers.map((c) => c.createdAt), 3, NOW);
assert.deepEqual(m.map((x) => x.label), ['Sep', 'Oct', 'Nov']); assert.deepEqual(m.map((x) => x.value), [1, 0, 2]);
assert.deepEqual(monthlyWonValue(rows.leads, 2, NOW).map((x) => x.value), [700, 5000]);

assert.equal(stageBreakdown(rows.leads).find((x) => x.stage === 'won')!.value, 5700);
assert.equal(winRate(rows.leads), 67); assert.equal(winRate([]), 0);
assert.deepEqual(sourceBreakdown(rows.leads)[0], { source: 'walk-in', count: 2 });
assert.deepEqual(activityMix(rows.activities, 30, NOW), [{ type: 'call', count: 2 }, { type: 'visit', count: 1 }], 'last 30 days only');
assert.equal(followUpCompletion(rows.followups, NOW), 33, '1 done of 3 due-or-done (17th and 30th are not due yet)');
assert.deepEqual(statusBreakdown(rows.customers).map((x) => x.count), [1, 1, 1]);
console.log('analytics tests passed');
