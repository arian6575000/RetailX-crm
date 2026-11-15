import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { useData, useDebounced } from '../../lib/hooks';
import { Repo } from '../../db/repo';
import { Customer, CustomerStatus } from '../../db/types';
import { dial, whatsapp } from '../../lib/contact';
import { space, TAB_SPACE } from '../../lib/theme';
import { Button, Chip, EmptyState, Fab, Header, IconButton, ListSkeleton, SearchBar, SectionHeader, T } from '../../ui/kit';
import { ActionMenu, Sheet } from '../../ui/Sheet';
import { CustomerRow } from '../../ui/parts';
import { STATUS_META } from '../../ui/meta';

const STATUS_FILTERS: { key: CustomerStatus | 'all'; label: string }[] = [{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'vip', label: 'VIP' }, { key: 'inactive', label: 'Inactive' }];

export default function Customers() {
  const router = useRouter();
  const { c } = useTheme();
  const { settings, confirm, toast, bump } = useApp();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [tagId, setTagId] = useState<number | null>(null);
  const [filters, setFilters] = useState(false);
  const [menu, setMenu] = useState<Customer | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, reload } = useData(async () => {
    const [list, groups, tags, total] = await Promise.all([Repo.listCustomers({ q: dq, status, groupId, tagId }), Repo.listGroups(), Repo.listTags(), Repo.listCustomers()]);
    return { list, groups, tags, total: total.length };
  }, [dq, status, groupId, tagId]);

  const activeFilters = (groupId != null ? 1 : 0) + (tagId != null ? 1 : 0);
  const open = useCallback((id: number) => router.push({ pathname: '/customer/[id]', params: { id: String(id) } }), [router]);
  const remove = async (cu: Customer) => {
    if (!(await confirm(`Delete ${cu.name}? Their timeline, notes, files and follow-ups are deleted too. This can’t be undone.`, { title: 'Delete customer', danger: true, okLabel: 'Delete' }))) return;
    const files = (await Repo.listAttachments({ customerId: cu.id })).map((a) => a.file);
    await Repo.deleteCustomer(cu.id);
    (await import('../../lib/files')).deleteFiles(files);
    bump(); toast('Customer deleted');
  };

  const header = useMemo(() => (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search name, phone, company…" onFilter={() => setFilters(true)} filterActive={activeFilters > 0} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={STATUS_FILTERS} keyExtractor={(i) => i.key} contentContainerStyle={{ gap: space.sm }}
        renderItem={({ item }) => <Chip label={item.label} selected={status === item.key} onPress={() => setStatus(item.key)} />} />
    </View>
  ), [q, status, activeFilters]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Customers" subtitle={data ? `${data.total} total${data.list.length !== data.total ? ` · ${data.list.length} shown` : ''}` : ' '} right={<IconButton icon="person-add-outline" tone="soft" label="Add customer" onPress={() => router.push('/customer/edit')} />} />
      <FlatList
        data={loading ? [] : data?.list ?? []} keyExtractor={(i) => String(i.id)} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: TAB_SPACE + 80 }} ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListHeaderComponent={header} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={9} removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} tintColor={c.primary} colors={[c.primary]} progressBackgroundColor={c.surface} />}
        ListEmptyComponent={loading ? <ListSkeleton /> : data && data.total === 0
          ? <EmptyState icon="people" title="Your customer list is empty" message="Add your first customer, or import from a CSV file or your phone contacts." action="Add customer" onAction={() => router.push('/customer/edit')} />
          : <EmptyState icon="search" title="No matches" message="Try a different name or clear the filters." action="Clear filters" onAction={() => { setQ(''); setStatus('all'); setGroupId(null); setTagId(null); }} />}
        renderItem={({ item }) => <CustomerRow customer={item} onPress={() => open(item.id)} onLongPress={() => setMenu(item)} onCall={item.phone ? () => dial(item.phone) : undefined} />}
      />
      <Fab label="Add customer" icon="add" bottom={TAB_SPACE - 18} onPress={() => router.push('/customer/edit')} />

      <Sheet visible={filters} onClose={() => setFilters(false)} title="Filter customers" footer={<View style={{ flexDirection: 'row', gap: space.md }}><Button variant="ghost" label="Reset" onPress={() => { setGroupId(null); setTagId(null); }} /><Button block label="Show results" onPress={() => setFilters(false)} /></View>}>
        <T v="overline" color={c.textMuted} style={{ marginBottom: space.sm }}>Group</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl }}>
          <Chip label="Any" selected={groupId == null} onPress={() => setGroupId(null)} />
          {data?.groups.map((g) => <Chip key={g.id} label={g.name} color={g.color} count={g.count} selected={groupId === g.id} onPress={() => setGroupId(groupId === g.id ? null : g.id)} />)}
        </View>
        <T v="overline" color={c.textMuted} style={{ marginBottom: space.sm }}>Tag</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Chip label="Any" selected={tagId == null} onPress={() => setTagId(null)} />
          {data?.tags.map((t) => <Chip key={t.id} label={t.name} icon="pricetag" count={t.count} selected={tagId === t.id} onPress={() => setTagId(tagId === t.id ? null : t.id)} />)}
        </View>
        {!data?.groups.length && !data?.tags.length ? <T v="caption" color={c.textMuted} style={{ marginTop: space.md }}>Create groups and tags from More → Groups & tags.</T> : null}
      </Sheet>

      <ActionMenu visible={!!menu} onClose={() => setMenu(null)} title={menu?.name} subtitle={menu ? STATUS_META[menu.status].label : undefined} actions={menu ? [
        ...(menu.phone ? [{ label: 'Call', icon: 'call' as const, onPress: () => dial(menu.phone) }, { label: 'WhatsApp', icon: 'logo-whatsapp' as const, onPress: () => whatsapp(menu.phone, settings.countryCode) }] : []),
        { label: 'Add follow-up', icon: 'alarm' as const, onPress: () => router.push({ pathname: '/followup/edit', params: { customerId: String(menu.id) } }) },
        { label: 'Edit', icon: 'create' as const, onPress: () => router.push({ pathname: '/customer/edit', params: { id: String(menu.id) } }) },
        { label: 'Delete', icon: 'trash' as const, danger: true, onPress: () => remove(menu) },
      ] : []} />
    </View>
  );
}
