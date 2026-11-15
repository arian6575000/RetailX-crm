import React, { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { useData } from '../../lib/hooks';
import { Repo } from '../../db/repo';
import { Lead, LEAD_STAGES, LeadStage, STAGE_PROBABILITY } from '../../db/types';
import { Fmt } from '../../lib/format';
import { radius, space, TAB_SPACE } from '../../lib/theme';
import { Card, EmptyState, Fab, Header, IconButton, ListSkeleton, Segmented, T } from '../../ui/kit';
import { ActionMenu } from '../../ui/Sheet';
import { LeadCard } from '../../ui/parts';
import { STAGE_META } from '../../ui/meta';
import { useCan } from '../../license/LicenseGate';
import { LockedScreen } from '../../ui/Locked';
import { haptic } from '../../lib/haptics';

type View_ = 'board' | 'list';

export default function Pipeline() {
  const can = useCan();
  const router = useRouter();
  const { c } = useTheme();
  const { bump, toast, confirm } = useApp();
  const [mode, setMode] = useState<View_>('board');
  const [menu, setMenu] = useState<Lead | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, reload } = useData(() => Repo.listLeads(), []);
  if (!can('pipeline.manage')) return <LockedScreen title="Pipeline" feature="Sales pipeline" />;

  const leads = data ?? [];
  const open = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
  const openValue = open.reduce((s, l) => s + l.value, 0);
  const weighted = open.reduce((s, l) => s + (l.value * (STAGE_PROBABILITY[l.stage] ?? 0)) / 100, 0);
  const edit = (id: number) => router.push({ pathname: '/lead/edit', params: { id: String(id) } });
  const move = async (l: Lead, stage: LeadStage) => {
    if (stage === l.stage) return;
    if (stage === 'won') { const cid = await Repo.convertLead(l.id); bump(); toast('Won! Customer profile ready', 'success'); router.push({ pathname: '/customer/[id]', params: { id: String(cid) } }); return; }
    await Repo.moveLead(l.id, stage); haptic.success(); bump(); toast(`Moved to ${STAGE_META[stage].label}`);
  };
  const remove = async (l: Lead) => { if (await confirm(`Delete lead “${l.name}”?`, { danger: true, okLabel: 'Delete' })) { await Repo.deleteLead(l.id); bump(); toast('Lead deleted'); } };
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} tintColor={c.primary} colors={[c.primary]} progressBackgroundColor={c.surface} />;

  const summary = (
    <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.md }}>
      <Card style={{ flex: 1 }} pad="md"><T v="caption" color={c.textMuted}>Open pipeline</T><T v="title" color={c.primary} style={{ marginTop: 2 }}>{Fmt.money(openValue)}</T><T v="caption" color={c.textMuted}>{open.length} open leads</T></Card>
      <Card style={{ flex: 1 }} pad="md"><T v="caption" color={c.textMuted}>Weighted forecast</T><T v="title" color={c.success} style={{ marginTop: 2 }}>{Fmt.money(weighted)}</T><T v="caption" color={c.textMuted}>by stage odds</T></Card>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Pipeline" subtitle="Track every deal from first contact to close" right={<IconButton icon="add" tone="primary" label="Add lead" onPress={() => router.push('/lead/edit')} />} />
      <View style={{ paddingHorizontal: space.lg }}>
        {summary}
        <Segmented<View_> value={mode} onChange={setMode} options={[{ key: 'board', label: 'Board' }, { key: 'list', label: 'List' }]} />
      </View>
      {loading ? <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}><ListSkeleton rows={4} /></View>
        : !leads.length ? <View style={{ paddingHorizontal: space.lg }}><EmptyState icon="funnel" title="No leads yet" message="Add a lead to start tracking it through your sales stages." action="Add lead" onAction={() => router.push('/lead/edit')} /></View>
        : mode === 'board' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={290} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md, paddingBottom: TAB_SPACE + 80 }}>
            {LEAD_STAGES.map((s) => {
              const col = leads.filter((l) => l.stage === s);
              const tone = STAGE_META[s].color(c);
              return (
                <View key={s} style={{ width: 278, alignSelf: 'flex-start', backgroundColor: c.surfaceAlt, borderRadius: radius.lg, padding: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.sm }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tone }} />
                    <T v="bodyStrong" style={{ flex: 1 }}>{STAGE_META[s].label}</T>
                    <T v="caption" color={c.textMuted}>{col.length} · {Fmt.compact(col.reduce((a, l) => a + l.value, 0))}</T>
                  </View>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space.sm }}>
                    {col.length ? col.map((l) => <LeadCard key={l.id} lead={l} compact onPress={() => edit(l.id)} onLongPress={() => setMenu(l)} />)
                      : <T v="caption" color={c.textFaint} align="center" style={{ paddingVertical: space.xl }}>No leads here</T>}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <FlatList data={leads} keyExtractor={(l) => String(l.id)} refreshControl={refresh} contentContainerStyle={{ padding: space.lg, paddingBottom: TAB_SPACE + 80 }} ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
            renderItem={({ item }) => <LeadCard lead={item} onPress={() => edit(item.id)} onLongPress={() => setMenu(item)} />} />
        )}
      <Fab label="Add lead" icon="add" bottom={TAB_SPACE - 18} onPress={() => router.push('/lead/edit')} />
      <ActionMenu visible={!!menu} onClose={() => setMenu(null)} title={menu?.name} subtitle={menu ? `${STAGE_META[menu.stage].label} · ${Fmt.money(menu.value)}` : undefined} actions={menu ? [
        ...LEAD_STAGES.filter((s) => s !== menu.stage).map((s) => ({ label: `Move to ${STAGE_META[s].label}`, icon: (s === 'won' ? 'trophy' : s === 'lost' ? 'close-circle' : 'arrow-forward-circle') as any, onPress: () => move(menu, s) })),
        { label: 'Edit lead', icon: 'create' as const, onPress: () => edit(menu.id) },
        { label: 'Delete', icon: 'trash' as const, danger: true, onPress: () => remove(menu) },
      ] : []} />
    </View>
  );
}
