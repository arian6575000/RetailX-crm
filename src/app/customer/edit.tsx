import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { Repo } from '../../db/repo';
import { CUSTOMER_STATUSES, CustomerStatus } from '../../db/types';
import { Button, Chip, Field, Header, Screen, Segmented, T } from '../../ui/kit';
import { space } from '../../lib/theme';
import { STATUS_META } from '../../ui/meta';

export default function CustomerEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = id ? Number(id) : null;
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { toast, bump, confirm } = useApp();
  const [f, setF] = useState({ name: '', company: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [status, setStatus] = useState<CustomerStatus>('active');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [newTag, setNewTag] = useState('');
  const [groups, setGroups] = useState<{ id: number; name: string; color: string }[]>([]);
  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [err, setErr] = useState<{ name?: string; email?: string }>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setErr({}); };

  useEffect(() => {
    (async () => {
      setGroups(await Repo.listGroups()); setTags(await Repo.listTags());
      if (editing) {
        const cu = await Repo.getCustomer(editing);
        if (cu) { setF({ name: cu.name, company: cu.company, phone: cu.phone, email: cu.email, city: cu.city, address: cu.address, notes: cu.notes }); setStatus(cu.status); setGroupId(cu.groupId); setTagIds((cu.tags || []).map((t) => t.id)); }
      }
    })();
  }, [editing]);

  const pickContact = async () => {
    try {
      const p = await Contacts.requestPermissionsAsync();
      if (!p.granted) { toast('Contacts permission was not granted', 'error'); return; }
      const picked = await Contacts.presentContactPickerAsync();
      if (!picked) return;
      setF((x) => ({ ...x, name: picked.name || [picked.firstName, picked.lastName].filter(Boolean).join(' ') || x.name, phone: picked.phoneNumbers?.[0]?.number || x.phone, email: picked.emails?.[0]?.email || x.email, company: picked.company || x.company }));
    } catch { toast('Could not open contacts', 'error'); }
  };

  const addTag = async () => {
    const n = newTag.trim(); if (!n) return;
    const tid = await Repo.upsertTag(n); setTags(await Repo.listTags()); setTagIds((p) => (p.includes(tid) ? p : [...p, tid])); setNewTag('');
  };

  const save = async () => {
    const e: typeof err = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
    setErr(e); if (e.name || e.email) return;
    if (!editing && f.phone.trim()) {
      const dup = (await Repo.existingPhones()).has(f.phone.replace(/\D/g, ''));
      if (dup && !(await confirm('A customer with this phone number already exists. Save anyway?', { title: 'Possible duplicate', okLabel: 'Save anyway' }))) return;
    }
    setBusy(true);
    try {
      const newId = await Repo.saveCustomer({ id: editing ?? undefined, ...f, status, groupId }, tagIds);
      bump(); toast(editing ? 'Customer updated' : 'Customer added', 'success');
      if (editing) router.back(); else router.replace({ pathname: '/customer/[id]', params: { id: String(newId) } });
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={editing ? 'Edit customer' : 'New customer'} back large={false} modal right={!editing ? <Button size="sm" variant="soft" icon="person-circle" label="Contacts" onPress={pickContact} /> : undefined} />
      <Screen stickyFooter={<View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border }}><Button block icon="checkmark" label={editing ? 'Save changes' : 'Add customer'} onPress={save} loading={busy} /></View>} bottomInset={false} contentStyle={{ paddingBottom: space.xl }}>
        <Field label="Full name *" value={f.name} onChangeText={set('name')} placeholder="e.g. Ali Raza" icon="person-outline" autoCapitalize="words" error={err.name} autoFocus={!editing} />
        <Field label="Company" value={f.company} onChangeText={set('company')} placeholder="Optional" icon="business-outline" autoCapitalize="words" />
        <Field label="Phone" value={f.phone} onChangeText={set('phone')} placeholder="0300 1234567" icon="call-outline" keyboardType="phone-pad" />
        <Field label="Email" value={f.email} onChangeText={set('email')} placeholder="name@example.com" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" error={err.email} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="City" value={f.city} onChangeText={set('city')} placeholder="Karachi" autoCapitalize="words" />
          <Field style={{ flex: 1.4 }} label="Address" value={f.address} onChangeText={set('address')} placeholder="Street, area" />
        </View>
        <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Status</T>
        <View style={{ marginBottom: space.lg }}><Segmented<CustomerStatus> value={status} onChange={setStatus} options={CUSTOMER_STATUSES.map((s) => ({ key: s, label: STATUS_META[s].label }))} /></View>
        {groups.length ? (<>
          <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Group</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
            <Chip label="None" selected={groupId == null} onPress={() => setGroupId(null)} />
            {groups.map((g) => <Chip key={g.id} label={g.name} color={g.color} selected={groupId === g.id} onPress={() => setGroupId(groupId === g.id ? null : g.id)} />)}
          </View>
        </>) : null}
        <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Tags</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
          {tags.map((t) => <Chip key={t.id} label={t.name} icon="pricetag" selected={tagIds.includes(t.id)} onPress={() => setTagIds((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id]))} />)}
        </View>
        <Field value={newTag} onChangeText={setNewTag} placeholder="Add a new tag" icon="pricetag-outline" returnKeyType="done" onSubmitEditing={addTag} right={newTag.trim() ? <Button size="sm" variant="soft" label="Add" onPress={addTag} /> : undefined} />
        <Field label="About this customer" value={f.notes} onChangeText={set('notes')} multiline placeholder="Preferences, how you met, anything useful…" />
      </Screen>
    </View>
  );
}
