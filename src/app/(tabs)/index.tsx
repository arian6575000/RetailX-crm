import React from 'react';
import { RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { useData } from '../../lib/hooks';
import { Repo } from '../../db/repo';
import { dashboardStats, monthlyCounts, monthlyWonValue, winRate } from '../../lib/analytics';
import { Fmt } from '../../lib/format';
import { radius, space, TAB_SPACE } from '../../lib/theme';
import { AnimatedNumber, Avatar, Card, EmptyState, FadeIn, Hero, IconButton, IconName, Pressy, Screen, SectionHeader, Skeleton, SwipeRow, T } from '../../ui/kit';
import { Sparkline } from '../../ui/charts';
import { FollowUpCard, TimelineItem } from '../../ui/parts';
import { Header } from '../../ui/kit';
import { Credit } from '../../ui/kit';
import { useCan } from '../../license/LicenseGate';
import { haptic } from '../../lib/haptics';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const router = useRouter();
  const { c } = useTheme();
  const { settings, bump, toast } = useApp();
  const can = useCan();
  const { data, loading, reload } = useData(async () => {
    const [rows, followups, acts, customers] = await Promise.all([Repo.analyticsRows(), Repo.listFollowUps({ done: false }), Repo.listActivities({ limit: 5 }), Repo.customerMap()]);
    return { rows, followups, acts, customers };
  });
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  const stats = data ? dashboardStats(data.rows) : null;
  const won6 = data ? monthlyWonValue(data.rows.leads, 6).map((m) => m.value) : [];
  const cust6 = data ? monthlyCounts(data.rows.customers.map((x) => x.createdAt), 6).map((m) => m.value) : [];
  const empty = !!data && data.rows.customers.length === 0 && data.rows.leads.length === 0;
  const name = settings.ownerName.split(' ')[0];

  const quick: { icon: IconName; label: string; go: () => void; color: string }[] = [
    { icon: 'person-add', label: 'Customer', go: () => router.push('/customer/edit'), color: c.primary },
    { icon: 'flag', label: 'Lead', go: () => router.push('/lead/edit'), color: c.secondary },
    { icon: 'alarm', label: 'Follow-up', go: () => router.push('/followup/edit'), color: c.warning },
    { icon: 'stats-chart', label: 'Analytics', go: () => router.push('/analytics'), color: c.accent },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={`${greeting()}${name ? ',' : ''}${name ? '\n' + name : ''}`} subtitle={settings.businessName} right={<IconButton icon="settings-outline" tone="soft" label="Settings" onPress={() => router.push('/settings')} />} />
      <Screen contentStyle={{ paddingBottom: TAB_SPACE + 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} colors={[c.primary]} progressBackgroundColor={c.surface} />}>
        {loading || !stats ? (
          <View style={{ gap: space.lg }}><Skeleton h={190} r={radius.xl} /><View style={{ flexDirection: 'row', gap: space.md }}><Skeleton h={96} r={radius.lg} w="31%" /><Skeleton h={96} r={radius.lg} w="31%" /><Skeleton h={96} r={radius.lg} w="31%" /></View><Skeleton h={120} r={radius.lg} /></View>
        ) : empty ? (
          <FadeIn>
            <Hero><T v="overline" color="rgba(255,255,255,0.8)">Welcome</T><T v="title" color="#FFFFFF" style={{ marginTop: 6 }}>Let’s build your customer base</T><T v="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>Add your first customer or import your contacts to see your dashboard come alive.</T></Hero>
            <EmptyState icon="people" title="No customers yet" message="Add one by one, or bring in a CSV file or your phone contacts in seconds." action="Add first customer" onAction={() => router.push('/customer/edit')} />
            {can('data.importExport') ? <Pressy onPress={() => router.push('/import-export')} style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}><T v="label" color={c.primary}>Import customers instead</T></Pressy> : null}
          </FadeIn>
        ) : (
          <>
            <FadeIn>
              <Hero>
                <T v="overline" color="rgba(255,255,255,0.78)">Open pipeline</T>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
                  <AnimatedNumber value={stats.pipelineValue} format={Fmt.money} v="display" color="#FFFFFF" />
                  <Sparkline values={won6} color="#FFFFFF" width={96} height={40} />
                </View>
                <T v="label" color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>Forecast {Fmt.money(stats.weightedValue)} · {stats.openLeads} open lead{stats.openLeads === 1 ? '' : 's'}</T>
                <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
                  <HeroStat label="Won value" value={Fmt.compact(stats.wonValueMonth)} />
                  <HeroStat label="Deals won" value={String(stats.wonCountMonth)} />
                  <HeroStat label="Win rate" value={`${winRate(data!.rows.leads)}%`} />
                </View>
              </Hero>
            </FadeIn>

            <FadeIn index={1}>
              <SectionHeader title="Today’s focus" action="All follow-ups" onAction={() => router.push('/followups')} />
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <FocusTile label="Overdue" value={stats.overdue} tone={stats.overdue ? c.danger : c.textFaint} icon="alert-circle" onPress={() => router.push('/followups')} />
                <FocusTile label="Due today" value={stats.dueToday} tone={stats.dueToday ? c.warning : c.textFaint} icon="today" onPress={() => router.push('/followups')} />
                <FocusTile label="Next 7 days" value={stats.upcoming7} tone={c.primary} icon="calendar" onPress={() => router.push('/followups')} />
              </View>
            </FadeIn>

            <FadeIn index={2}>
              <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
                {quick.map((q) => (
                  <Pressy key={q.label} onPress={q.go} haptics="light" accessibilityLabel={q.label} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: q.color + '1F', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={q.icon} size={26} color={q.color} /></View>
                    <T v="caption" color={c.textMuted}>{q.label}</T>
                  </Pressy>
                ))}
              </View>
            </FadeIn>

            <FadeIn index={3}>
              <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
                <Card style={{ flex: 1 }} onPress={() => router.push('/customers')} pad="md">
                  <T v="caption" color={c.textMuted}>Customers</T>
                  <AnimatedNumber value={stats.totalCustomers} v="title" style={{ marginTop: 2 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <T v="caption" color={c.success}>+{stats.newThisMonth} this month</T>
                    <Sparkline values={cust6} width={52} height={24} color={c.success} />
                  </View>
                </Card>
                <Card style={{ flex: 1 }} onPress={() => router.push('/customers')} pad="md">
                  <T v="caption" color={c.textMuted}>VIP customers</T>
                  <AnimatedNumber value={stats.vip} v="title" style={{ marginTop: 2 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}><Ionicons name="star" size={13} color={c.secondary} /><T v="caption" color={c.textMuted}>Top accounts</T></View>
                </Card>
              </View>
            </FadeIn>

            {data!.followups.length ? (
              <FadeIn index={4}>
                <SectionHeader title="Up next" />
                <View style={{ gap: space.sm }}>
                  {data!.followups.slice(0, 3).map((f) => (
                    <SwipeRow key={f.id} onRight={async () => { await Repo.completeFollowUp(f.id); bump(); toast('Follow-up done', 'success'); }} onLeft={async () => { await Repo.snoozeFollowUp(f.id, f.dueAt + 86400000); bump(); toast('Snoozed 1 day'); }}>
                      <FollowUpCard f={f} customerName={f.customerId ? data!.customers[f.customerId]?.name : undefined} onPress={() => router.push({ pathname: '/followup/edit', params: { id: String(f.id) } })}
                        onToggle={async () => { await Repo.completeFollowUp(f.id); haptic.success(); bump(); }} />
                    </SwipeRow>
                  ))}
                </View>
              </FadeIn>
            ) : null}

            {data!.acts.length ? (
              <FadeIn index={5}>
                <SectionHeader title="Recent activity" />
                <Card>{data!.acts.map((a, i) => <TimelineItem key={a.id} a={{ ...a, title: `${a.title}${a.customerId && data!.customers[a.customerId] ? ' · ' + data!.customers[a.customerId].name : ''}` }} last={i === data!.acts.length - 1} />)}</Card>
              </FadeIn>
            ) : null}
          </>
        )}
        <Credit style={{ marginTop: space.xxl }} />
      </Screen>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 }}>
      <T v="bodyStrong" color="#FFFFFF" numberOfLines={1}>{value}</T>
      <T v="caption" color="rgba(255,255,255,0.8)" numberOfLines={1}>{label}</T>
    </View>
  );
}

function FocusTile({ label, value, tone, icon, onPress }: { label: string; value: number; tone: string; icon: IconName; onPress: () => void }) {
  return (
    <Card onPress={onPress} pad="md" style={{ flex: 1, gap: 8 }}>
      <Ionicons name={icon} size={20} color={tone} />
      <AnimatedNumber value={value} v="title" />
      <T v="caption" numberOfLines={1} color={undefined} style={{ opacity: 0.75 }}>{label}</T>
    </Card>
  );
}
