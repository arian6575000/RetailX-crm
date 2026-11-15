// Pure analytics over the raw rows from Repo.analyticsRows() — no I/O so it is easy to test.
import { ActivityType, CustomerStatus, LEAD_STAGES, LeadStage, OPEN_STAGES, STAGE_PROBABILITY } from '../db/types';

export interface Rows {
  customers: { id: number; status: CustomerStatus; groupId: number | null; createdAt: number }[];
  leads: { id: number; stage: LeadStage; value: number; source: string; createdAt: number; closedAt: number | null }[];
  activities: { id: number; type: ActivityType; at: number; amount: number }[];
  followups: { id: number; dueAt: number; done: boolean; doneAt: number | null; priority: string }[];
}

const DAY = 86400000;
export const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const startOfMonth = (t: number) => { const d = new Date(t); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };

export interface DashboardStats {
  totalCustomers: number; newThisMonth: number; vip: number;
  openLeads: number; pipelineValue: number; weightedValue: number;
  wonCountMonth: number; wonValueMonth: number;
  overdue: number; dueToday: number; upcoming7: number;
}

export function dashboardStats(r: Rows, nowMs = Date.now()): DashboardStats {
  const m0 = startOfMonth(nowMs), d0 = startOfDay(nowMs), d1 = d0 + DAY;
  const open = r.leads.filter((l) => OPEN_STAGES.includes(l.stage));
  const pending = r.followups.filter((f) => !f.done);
  return {
    totalCustomers: r.customers.length,
    newThisMonth: r.customers.filter((c) => c.createdAt >= m0).length,
    vip: r.customers.filter((c) => c.status === 'vip').length,
    openLeads: open.length,
    pipelineValue: open.reduce((s, l) => s + l.value, 0),
    weightedValue: Math.round(open.reduce((s, l) => s + (l.value * STAGE_PROBABILITY[l.stage]) / 100, 0)),
    wonCountMonth: r.leads.filter((l) => l.stage === 'won' && (l.closedAt ?? 0) >= m0).length,
    wonValueMonth: r.leads.filter((l) => l.stage === 'won' && (l.closedAt ?? 0) >= m0).reduce((s, l) => s + l.value, 0),
    overdue: pending.filter((f) => f.dueAt < d0).length,
    dueToday: pending.filter((f) => f.dueAt >= d0 && f.dueAt < d1).length,
    upcoming7: pending.filter((f) => f.dueAt >= d1 && f.dueAt < d1 + 6 * DAY).length,
  };
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Count of timestamps per calendar month for the last `months` months (oldest first). */
export function monthlyCounts(stamps: number[], months = 6, nowMs = Date.now()): { label: string; value: number }[] {
  const now = new Date(nowMs);
  const out: { label: string; value: number; from: number; to: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    out.push({ label: MONTH_ABBR[new Date(from).getMonth()], value: 0, from, to });
  }
  for (const s of stamps) { const b = out.find((o) => s >= o.from && s < o.to); if (b) b.value++; }
  return out.map(({ label, value }) => ({ label, value }));
}

/** Sum of won-lead value per month for the last `months` months. */
export function monthlyWonValue(leads: Rows['leads'], months = 6, nowMs = Date.now()): { label: string; value: number }[] {
  const now = new Date(nowMs);
  const out: { label: string; value: number; from: number; to: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    out.push({ label: MONTH_ABBR[new Date(from).getMonth()], value: 0, from, to });
  }
  for (const l of leads) {
    if (l.stage !== 'won' || l.closedAt == null) continue;
    const b = out.find((o) => l.closedAt! >= o.from && l.closedAt! < o.to); if (b) b.value += l.value;
  }
  return out.map(({ label, value }) => ({ label, value }));
}

export function stageBreakdown(leads: Rows['leads']): { stage: LeadStage; count: number; value: number }[] {
  return LEAD_STAGES.map((stage) => {
    const ls = leads.filter((l) => l.stage === stage);
    return { stage, count: ls.length, value: ls.reduce((s, l) => s + l.value, 0) };
  });
}

/** Won / (won + lost), as a 0-100 integer. 0 when nothing is closed yet. */
export function winRate(leads: Rows['leads']): number {
  const won = leads.filter((l) => l.stage === 'won').length, lost = leads.filter((l) => l.stage === 'lost').length;
  return won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100);
}

export function sourceBreakdown(leads: Rows['leads']): { source: string; count: number }[] {
  const m = new Map<string, number>();
  leads.forEach((l) => m.set(l.source || 'other', (m.get(l.source || 'other') || 0) + 1));
  return [...m.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
}

export function activityMix(acts: Rows['activities'], days = 30, nowMs = Date.now()): { type: ActivityType; count: number }[] {
  const since = nowMs - days * DAY;
  const m = new Map<ActivityType, number>();
  acts.filter((a) => a.at >= since).forEach((a) => m.set(a.type, (m.get(a.type) || 0) + 1));
  return [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

/** Share of follow-ups finished on or before their due day (done / all that were due or done), 0-100. */
export function followUpCompletion(f: Rows['followups'], nowMs = Date.now()): number {
  const due = f.filter((x) => x.done || x.dueAt < startOfDay(nowMs) + DAY);
  if (!due.length) return 0;
  return Math.round((due.filter((x) => x.done).length / due.length) * 100);
}

export function statusBreakdown(customers: Rows['customers']): { status: CustomerStatus; count: number }[] {
  return (['active', 'vip', 'inactive'] as CustomerStatus[]).map((status) => ({ status, count: customers.filter((c) => c.status === status).length }));
}
