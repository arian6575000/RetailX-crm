import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../ctx/ThemeContext';
import { useData } from '../lib/hooks';
import { Repo } from '../db/repo';
import { activityMix, dashboardStats, followUpCompletion, monthlyCounts, monthlyWonValue, sourceBreakdown, stageBreakdown, statusBreakdown, winRate } from '../lib/analytics';
import { Fmt } from '../lib/format';
import { space } from '../lib/theme';
import { AnimatedNumber, Card, EmptyState, FadeIn, Header, ListSkeleton, Progress, Screen, SectionHeader, T } from '../ui/kit';
import { BarChart, DonutChart, HBars } from '../ui/charts';
import { ACTIVITY_META, SOURCE_LABEL, STAGE_META, STATUS_META } from '../ui/meta';
import { useCan } from '../license/LicenseGate';
import { LockedScreen } from '../ui/Locked';

export default function Analytics() {
  const can = useCan();
  const { c } = useTheme();
  const { data, loading } = useData(() => Repo.analyticsRows(), []);
  if (!can('analytics.view')) return <LockedScreen title="Analytics" feature="Analytics" />;
  const r = data;
  const stats = r ? dashboardStats(r) : null;
  const empty = r && !r.customers.length && !r.leads.length && !r.activities.length;
  const statusColor = { active: c.success, vip: c.secondary, inactive: c.textFaint } as Record<string, string>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Analytics" subtitle="How your business is moving" back />
      <Screen>
        {loading || !r || !stats ? <ListSkeleton rows={4} /> : empty ? <EmptyState icon="stats-chart" title="Nothing to analyse yet" message="Add customers, leads and activities and your trends appear here." /> : (
          <View style={{ gap: space.lg }}>
            <FadeIn index={0}>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Card style={{ flex: 1 }} pad="md"><T v="caption" color={c.textMuted}>Win rate</T><AnimatedNumber value={winRate(r.leads)} format={(n) => `${Math.round(n)}%`} color={c.success} /><T v="caption" color={c.textMuted}>of closed leads</T></Card>
                <Card style={{ flex: 1 }} pad="md"><T v="caption" color={c.textMuted}>Follow-up completion</T><AnimatedNumber value={followUpCompletion(r.followups)} format={(n) => `${Math.round(n)}%`} color={c.primary} /><T v="caption" color={c.textMuted}>done on time</T></Card>
              </View>
            </FadeIn>
            <FadeIn index={1}>
              <SectionHeader title="New customers" />
              <Card><BarChart data={monthlyCounts(r.customers.map((x) => x.createdAt))} summary="New customers per month, last six months" /></Card>
            </FadeIn>
            <FadeIn index={2}>
              <SectionHeader title="Won revenue" />
              <Card><BarChart data={monthlyWonValue(r.leads)} format={Fmt.compact} color={c.success} summary="Value of won deals per month, last six months" /></Card>
            </FadeIn>
            <FadeIn index={3}>
              <SectionHeader title="Pipeline by stage" />
              <Card style={{ alignItems: 'center', gap: space.lg }}>
                <DonutChart size={168} centerValue={String(r.leads.length)} centerLabel="leads" segments={stageBreakdown(r.leads).map((s) => ({ key: s.stage, label: STAGE_META[s.stage].label, value: s.count, color: STAGE_META[s.stage].color(c) }))} />
                <View style={{ alignSelf: 'stretch' }}>
                  <HBars format={Fmt.compact} rows={stageBreakdown(r.leads).filter((s) => s.count).map((s) => ({ key: s.stage, label: STAGE_META[s.stage].label, value: s.value, color: STAGE_META[s.stage].color(c), sub: `${s.count} lead${s.count === 1 ? '' : 's'}` }))} />
                </View>
              </Card>
            </FadeIn>
            <FadeIn index={4}>
              <SectionHeader title="Where leads come from" />
              <Card><HBars rows={sourceBreakdown(r.leads).map((s, i) => ({ key: s.source, label: SOURCE_LABEL[s.source] ?? s.source, value: s.count, color: [c.primary, c.secondary, c.accent, c.success, c.warning][i % 5] }))} /></Card>
            </FadeIn>
            <FadeIn index={5}>
              <SectionHeader title="Activity, last 30 days" />
              <Card><HBars rows={activityMix(r.activities).map((a) => ({ key: a.type, label: ACTIVITY_META[a.type].label, value: a.count, color: ACTIVITY_META[a.type].color(c) }))} /></Card>
            </FadeIn>
            <FadeIn index={6}>
              <SectionHeader title="Customer mix" />
              <Card style={{ gap: space.md }}>
                {statusBreakdown(r.customers).map((s) => (
                  <View key={s.status} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="body">{STATUS_META[s.status].label}</T><T v="bodyStrong">{s.count}</T></View>
                    <Progress value={r.customers.length ? (s.count / r.customers.length) * 100 : 0} tone={s.status === 'active' ? 'success' : 'primary'} />
                  </View>
                ))}
              </Card>
            </FadeIn>
          </View>
        )}
      </Screen>
    </View>
  );
}
