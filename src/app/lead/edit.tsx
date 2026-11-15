import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { Repo } from '../../db/repo';
import { LEAD_SOURCES, LEAD_STAGES, LeadStage } from '../../db/types';
import { Button, Chip, Field, Header, Screen, T } from '../../ui/kit';
import { DateTimeField } from '../../ui/DateTimeField';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { SOURCE_LABEL, STAGE_META } from '../../ui/meta';
import { space } from '../../lib/theme';
import { ymd } from '../../lib/dates';

export default function LeadEdit() {
  const { id, customerId } = useLocalSearchParams<{ id?: string; customerId?: string }>();
  const editing = id ? Number(id) : null;
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { toast, bump, confirm } = useApp();
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [value, setValue] = useState(''); const [notes, setNotes] = useState('');
  const [source, setSource] = useState('walk-in'); const [stage, setStage] = useState<LeadStage>('new');
  const [cust, setCust] = useState<number | null>(customerId ? Number(customerId) : null);
  const [close, setClose] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [existing, setExisting] = useState<{ stage: LeadStage } | null>(null);

  useEffect(() => {
    if (editing) (async () => {
      const l = await Repo.getLead(editing);
      if (l) { setName(l.name); setPhone(l.phone); setValue(l.value ? String(l.value) : ''); setNotes(l.notes); setSource(l.source); setStage(l.stage); setCust(l.customerId); setClose(l.expectedClose ? new Date(l.expectedClose + 'T10:00:00').getTime() : null); setExisting({ stage: l.stage }); }
    })();
    else if (customerId) Repo.getCustomer(Number(customerId)).then((cu) => { if (cu) { setName(cu.name); setPhone(cu.phone); } });
  }, [editing, customerId]);

  const save = async () => {
    if (!name.trim()) { setErr('Give this lead a name'); return; }
    await Repo.saveLead({ id: editing ?? undefined, name, phone, value: Number(value.replace(/[^\d.]/g, '')) || 0, source, stage, customerId: cust, expectedClose: close ? ymd(new Date(close)) : '', notes });
    bump(); toast(editing ? 'Lead updated' : 'Lead added', 'success'); router.back();
  };
  const convert = async () => {
    if (!editing) return;
    await save2();
    const cid = await Repo.convertLead(editing); bump(); toast('Won! Customer profile ready', 'success');
    router.replace({ pathname: '/customer/[id]', params: { id: String(cid) } });
  };
  const save2 = async () => { await Repo.saveLead({ id: editing!, name, phone, value: Number(value.replace(/[^\d.]/g, '')) || 0, source, stage, customerId: cust, expectedClose: close ? ymd(new Date(close)) : '', notes }); };
  const remove = async () => { if (editing && (await confirm('Delete this lead?', { danger: true, okLabel: 'Delete' }))) { await Repo.deleteLead(editing); bump(); router.back(); } };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={editing ? 'Edit lead' : 'New lead'} back large={false} modal right={editing ? <Button size="sm" variant="danger" icon="trash" label="Delete" onPress={remove} /> : undefined} />
      <Screen bottomInset={false} contentStyle={{ paddingBottom: space.xl }} stickyFooter={
        <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', gap: space.md }}>
          {editing && existing && existing.stage !== 'won' ? <Button variant="soft" icon="trophy" label="Mark won" onPress={convert} /> : null}
          <Button block icon="checkmark" label={editing ? 'Save changes' : 'Add lead'} onPress={save} />
        </View>}>
        <Field label="Lead name *" value={name} onChangeText={(v) => { setName(v); setErr(''); }} placeholder="Person or business" icon="person-outline" autoCapitalize="words" error={err || undefined} autoFocus={!editing && !customerId} />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="0300 1234567" icon="call-outline" keyboardType="phone-pad" />
        <Field label="Deal value" value={value} onChangeText={setValue} placeholder="0" icon="cash-outline" keyboardType="decimal-pad" />
        <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Stage</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
          {LEAD_STAGES.map((s) => <Chip key={s} label={STAGE_META[s].label} color={STAGE_META[s].color(c)} selected={stage === s} onPress={() => setStage(s)} />)}
        </View>
        <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Source</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
          {LEAD_SOURCES.map((s) => <Chip key={s} label={SOURCE_LABEL[s]} selected={source === s} onPress={() => setSource(s)} />)}
        </View>
        {close != null ? <DateTimeField label="Expected close date" value={close} onChange={setClose} /> : <Button variant="soft" icon="calendar" label="Set expected close date" onPress={() => { const d = new Date(); d.setDate(d.getDate() + 14); setClose(d.getTime()); }} style={{ marginBottom: space.lg }} />}
        <CustomerPicker label="Linked customer" value={cust} onChange={(i) => setCust(i)} />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Requirements, objections, next step…" />
      </Screen>
    </View>
  );
}
