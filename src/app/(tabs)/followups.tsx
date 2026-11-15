import React, { useMemo, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { useData } from '../../lib/hooks';
import { Repo } from '../../db/repo';
import { FollowUp } from '../../db/types';
import { startOfDay } from '../../lib/analytics';
import { haptic } from '../../lib/haptics';
import { radius, space, TAB_SPACE } from '../../lib/theme';
import { EmptyState, Fab, Header, IconButton, ListSkeleton, Pressy, Segmented, SwipeRow, T } from '../../ui/kit';
import { ActionMenu } from '../../ui/Sheet';
import { FollowUpCard } from '../../ui/parts';

const DAY = 86400000;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FollowUps() {
  const router = useRouter();
  const { c } = useTheme();
  const { bump, toast, confirm } = useApp();
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [day, setDay] = useState<number | null>(null); // start-of-day timestamp filter
  const [menu, setMenu] = useState<FollowUp | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, reload } = useData(async () => {
    const [open, done, customers] = await Promise.all([Repo.listFollowUps({ done: false }), Repo.listFollowUps({ done: true }), Repo.customerMap()]);
    return { open, done, customers };
  });

  const today0 = startOfDay(Date.now());
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const t = today0 + i * DAY; const d = new Date(t);
    return { t, label: i === 0 ? 'Today' : WD[d.getDay()], num: d.getDate(), count: (data?.open ?? []).filter((f) => f.dueAt >= t && f.dueAt < t + DAY).length };
  }), [data, today0]);

  const sections = useMemo(() => {
    if (!data) return [];
    if (tab === 'done') return data.done.length ? [{ key: 'done', title: 'Completed', tone: c.success, data: data.done.slice(0, 80) }] : [];
    let list = data.open;
    if (day != null) list = list.filter((f) => f.dueAt >= day && f.dueAt < day + DAY);
    const overdue = list.filter((f) => f.dueAt < today0), today = list.filter((f) => f.dueAt >= today0 && f.dueAt < today0 + DAY), later = list.filter((f) => f.dueAt >= today0 + DAY);
    return [
      { key: 'overdue', title: `Overdue · ${overdue.length}`, tone: c.danger, data: overdue },
      { key: 'today', title: `Today · ${today.length}`, tone: c.warning, data: today },
      { key: 'later', title: `Upcoming · ${later.length}`, tone: c.primary, data: later },
    ].filter((s) => s.data.length);
  }, [data, tab, day, today0, c]);

  const complete = async (f: FollowUp) => { await Repo.completeFollowUp(f.id, !f.done); haptic.success(); bump(); toast(f.done ? 'Reopened' : 'Marked done', f.done ? 'default' : 'success'); };
  const snooze = async (f: FollowUp, ms: number) => { await Repo.snoozeFollowUp(f.id, Math.max(Date.now(), f.dueAt) + ms); bump(); toast('Snoozed'); };
  const edit = (f: FollowUp) => router.push({ pathname: '/followup/edit', params: { id: String(f.id) } });
  const remove = async (f: FollowUp) => { if (await confirm(`Delete “${f.title}”?`, { danger: true, okLabel: 'Delete' })) { await Repo.deleteFollowUp(f.id); bump(); toast('Deleted'); } };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Follow-ups" subtitle={data ? `${data.open.length} open · swipe to complete or snooze` : ' '} right={<IconButton icon="add" tone="primary" label="New follow-up" onPress={() => router.push('/followup/edit')} />} />
      <SectionList
        sections={sections} keyExtractor={(f) => String(f.id)} stickySectionHeadersEnabled={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: TAB_SPACE + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} tintColor={c.primary} colors={[c.primary]} progressBackgroundColor={c.surface} />}
        ListHeaderComponent={
          <View style={{ gap: space.lg, paddingBottom: space.sm }}>
            <Segmented options={[{ key: 'todo', label: 'To do' }, { key: 'done', label: 'Done' }]} value={tab} onChange={(k) => { setTab(k); setDay(null); }} />
            {tab === 'todo' ? (
              <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel="Next seven days">
                {week.map((d) => {
                  const on = day === d.t;
                  return (
                    <Pressy key={d.t} onPress={() => setDay(on ? null : d.t)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${d.label} ${d.num}, ${d.count} follow-ups`} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.md, backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.border }}>
                      <T v="caption" color={on ? c.onPrimary : c.textMuted} style={{ fontSize: 11 }}>{d.label}</T>
                      <T v="bodyStrong" color={on ? c.onPrimary : c.text}>{d.num}</T>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.count ? (on ? c.onPrimary : c.primary) : 'transparent' }} />
                    </Pressy>
                  );
                })}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={loading ? <ListSkeleton rows={4} /> : tab === 'done'
          ? <EmptyState icon="checkmark-done" title="Nothing completed yet" message="Follow-ups you finish will show up here." />
          : <EmptyState icon="checkmark-done-circle" title={day != null ? 'Nothing on this day' : 'You’re all caught up'} message={day != null ? 'Pick another day or add a follow-up.' : 'No pending follow-ups. Schedule the next touchpoint so no customer goes quiet.'} action="New follow-up" onAction={() => router.push('/followup/edit')} />}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.lg, marginBottom: space.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: section.tone }} />
            <T v="overline" color={c.textMuted}>{section.title}</T>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        renderItem={({ item }) => {
          const card = <FollowUpCard f={item} customerName={item.customerId ? data?.customers[item.customerId]?.name : undefined} onPress={() => edit(item)} onLongPress={() => setMenu(item)} onToggle={() => complete(item)} />;
          return item.done ? card : <SwipeRow onRight={() => complete(item)} onLeft={() => snooze(item, DAY)}>{card}</SwipeRow>;
        }}
      />
      <Fab label="New follow-up" icon="add" bottom={TAB_SPACE - 18} onPress={() => router.push('/followup/edit')} />
      <ActionMenu visible={!!menu} onClose={() => setMenu(null)} title={menu?.title} actions={menu ? [
        { label: menu.done ? 'Reopen' : 'Mark done', icon: 'checkmark-circle', onPress: () => complete(menu) },
        ...(!menu.done ? [{ label: 'Snooze 1 hour', icon: 'time' as const, onPress: () => snooze(menu, 3600000) }, { label: 'Snooze to tomorrow', icon: 'moon' as const, onPress: () => snooze(menu, DAY) }, { label: 'Snooze 1 week', icon: 'calendar' as const, onPress: () => snooze(menu, 7 * DAY) }] : []),
        { label: 'Edit', icon: 'create', onPress: () => edit(menu) },
        { label: 'Delete', icon: 'trash', danger: true, onPress: () => remove(menu) },
      ] : []} />
    </View>
  );
}
