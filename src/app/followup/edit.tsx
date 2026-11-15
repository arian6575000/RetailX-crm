import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { Repo } from '../../db/repo';
import { ActivityType, Priority, PRIORITIES } from '../../db/types';
import { Button, Chip, Field, Header, Screen, Segmented, T } from '../../ui/kit';
import { DateTimeField } from '../../ui/DateTimeField';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { ACTIVITY_META, PRIORITY_META } from '../../ui/meta';
import { space } from '../../lib/theme';

const CHANNELS: ActivityType[] = ['call', 'whatsapp', 'sms', 'email', 'meeting', 'visit'];

export default function FollowUpEdit() {
  const { id, customerId, leadId } = useLocalSearchParams<{ id?: string; customerId?: string; leadId?: string }>();
  const editing = id ? Number(id) : null;
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, toast, bump, confirm } = useApp();
  const defaultDue = () => { const d = new Date(); d.setDate(d.getDate() + settings.defaultFollowUpDays); d.setHours(10, 0, 0, 0); return d.getTime(); };
  const [title, setTitle] = useState(''); const [notes, setNotes] = useState('');
  const [cust, setCust] = useState<number | null>(customerId ? Number(customerId) : null);
  const [channel, setChannel] = useState<ActivityType>('call');
  const [priority, setPriority] = useState<Priority>('medium');
  const [due, setDue] = useState(defaultDue);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const f = (await Repo.listFollowUps()).find((x) => x.id === editing);
      if (f) { setTitle(f.title); setNotes(f.notes); setCust(f.customerId); setChannel(f.channel); setPriority(f.priority); setDue(f.dueAt); }
    })();
  }, [editing]);

  const save = async () => {
    if (!title.trim()) { setErr('Describe what needs to happen'); return; }
    await Repo.saveFollowUp({ id: editing ?? undefined, customerId: cust, leadId: leadId ? Number(leadId) : null, title, notes, channel, priority, dueAt: due });
    bump(); toast(editing ? 'Follow-up updated' : 'Follow-up scheduled', 'success'); router.back();
  };
  const remove = async () => { if (editing && (await confirm('Delete this follow-up?', { danger: true, okLabel: 'Delete' }))) { await Repo.deleteFollowUp(editing); bump(); router.back(); } };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={editing ? 'Edit follow-up' : 'New follow-up'} back large={false} modal right={editing ? <Button size="sm" variant="danger" icon="trash" label="Delete" onPress={remove} /> : undefined} />
      <Screen bottomInset={false} contentStyle={{ paddingBottom: space.xl }} stickyFooter={<View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border }}><Button block icon="alarm" label={editing ? 'Save changes' : 'Schedule follow-up'} onPress={save} /></View>}>
        <Field label="What needs to happen? *" value={title} onChangeText={(v) => { setTitle(v); setErr(''); }} placeholder="e.g. Send revised quotation" icon="flag-outline" error={err || undefined} autoFocus={!editing} />
        <CustomerPicker value={cust} onChange={(i) => setCust(i)} />
        <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>How</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
          {CHANNELS.map((ch) => <Chip key={ch} label={ACTIVITY_META[ch].label} icon={ACTIVITY_META[ch].icon} selected={channel === ch} onPress={() => setChannel(ch)} />)}
        </View>
        <DateTimeField label="When" value={due} onChange={setDue} />
        <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Priority</T>
        <View style={{ marginBottom: space.lg }}><Segmented<Priority> value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ key: p, label: PRIORITY_META[p].label }))} /></View>
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Anything to remember when this comes up" />
      </Screen>
    </View>
  );
}
