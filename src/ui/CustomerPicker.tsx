import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ctx/ThemeContext';
import { Repo } from '../db/repo';
import { Customer } from '../db/types';
import { useData, useDebounced } from '../lib/hooks';
import { Avatar, Pressy, SearchBar, T } from './kit';
import { Sheet } from './Sheet';
import { radius, space } from '../lib/theme';

/** Form field that opens a searchable customer list in a sheet. */
export function CustomerPicker({ label = 'Customer', value, onChange, optional = true }: { label?: string; value: number | null; onChange: (id: number | null, c?: Customer) => void; optional?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const { data } = useData(async () => ({ list: await Repo.listCustomers({ q: dq }), selected: value ? await Repo.getCustomer(value) : null }), [dq, value]);
  return (
    <View style={{ marginBottom: space.lg }}>
      <T v="label" color={c.textMuted} style={{ marginBottom: 6 }}>{label}</T>
      <Pressy onPress={() => setOpen(true)} scale={0.99} accessibilityLabel={`${label}: ${data?.selected?.name ?? 'none selected'}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: space.md }}>
        {data?.selected ? <Avatar name={data.selected.name} size={32} /> : <Ionicons name="person-outline" size={20} color={c.textFaint} />}
        <T v="body" color={data?.selected ? c.text : c.textFaint} style={{ flex: 1 }} numberOfLines={1}>{data?.selected?.name ?? 'Select a customer'}</T>
        {data?.selected && optional ? <Pressy onPress={() => onChange(null)} hitSlop={10} accessibilityLabel="Clear customer"><Ionicons name="close-circle" size={20} color={c.textFaint} /></Pressy> : <Ionicons name="chevron-down" size={18} color={c.textFaint} />}
      </Pressy>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Choose customer" tall>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search customers" />
        <FlatList scrollEnabled={false} data={data?.list.slice(0, 60) ?? []} keyExtractor={(i) => String(i.id)} style={{ marginTop: space.md }}
          ListEmptyComponent={<T v="body" color={c.textMuted} align="center" style={{ paddingVertical: space.xl }}>No customers found.</T>}
          renderItem={({ item }) => (
            <Pressy onPress={() => { onChange(item.id, item); setOpen(false); }} scale={0.99} accessibilityLabel={item.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 58 }}>
              <Avatar name={item.name} size={40} />
              <View style={{ flex: 1 }}><T v="bodyStrong" numberOfLines={1}>{item.name}</T><T v="caption" color={c.textMuted} numberOfLines={1}>{item.company || item.phone}</T></View>
              {item.id === value ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
            </Pressy>
          )} />
      </Sheet>
    </View>
  );
}
