// Reusable domain components built from the kit: customer row, follow-up card, lead card, timeline item, log-activity sheet.
import React, { memo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ctx/ThemeContext';
import { Avatar, Badge, Button, Card, Chip, Field, IconButton, Pressy, T } from './kit';
import { Sheet } from './Sheet';
import { ACTIVITY_META, PRIORITY_META, SOURCE_LABEL, STAGE_META, STATUS_META } from './meta';
import { ACTIVITY_TYPES, Activity, ActivityType, Customer, FollowUp, Lead } from '../db/types';
import { Fmt } from '../lib/format';
import { radius, space } from '../lib/theme';

// ───────── Customer row ─────────
export const CustomerRow = memo(function CustomerRow({ customer, onPress, onLongPress, onCall }: { customer: Customer; onPress: () => void; onLongPress: () => void; onCall?: () => void }) {
  const { c } = useTheme();
  const st = STATUS_META[customer.status];
  const sub = [customer.company, customer.city].filter(Boolean).join(' · ') || customer.phone || customer.email || 'No contact details';
  return (
    <Card onPress={onPress} onLongPress={onLongPress} pad="md" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Avatar name={customer.name} size={48} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T v="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{customer.name}</T>
          {customer.status === 'vip' ? <Ionicons name="star" size={14} color={c.secondary} /> : null}
        </View>
        <T v="caption" color={c.textMuted} numberOfLines={1}>{sub}</T>
        {customer.tags?.length || customer.status === 'inactive' ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            {customer.status === 'inactive' ? <Badge label={st.label} tone={st.tone} /> : null}
            {customer.tags?.slice(0, 2).map((t) => <Badge key={t.id} label={t.name} tone="primary" />)}
            {(customer.tags?.length || 0) > 2 ? <Badge label={`+${customer.tags!.length - 2}`} /> : null}
          </View>
        ) : null}
      </View>
      {onCall && customer.phone ? <IconButton icon="call" tone="soft" label={`Call ${customer.name}`} onPress={onCall} size={20} /> : <Ionicons name="chevron-forward" size={18} color={c.textFaint} />}
    </Card>
  );
});

// ───────── Follow-up card ─────────
export const FollowUpCard = memo(function FollowUpCard({ f, customerName, onPress, onLongPress, onToggle }: { f: FollowUp; customerName?: string; onPress: () => void; onLongPress?: () => void; onToggle: () => void }) {
  const { c } = useTheme();
  const pr = PRIORITY_META[f.priority]; const am = ACTIVITY_META[f.channel] ?? ACTIVITY_META.call;
  const overdue = !f.done && f.dueAt < Date.now() - 60000;
  return (
    <Card onPress={onPress} onLongPress={onLongPress} pad={0} style={{ flexDirection: 'row', overflow: 'hidden' }}>
      <View style={{ width: 5, backgroundColor: f.done ? c.border : pr.color(c) }} />
      <View style={{ flex: 1, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressy onPress={onToggle} haptics="medium" accessibilityRole="checkbox" accessibilityState={{ checked: f.done }} accessibilityLabel={f.done ? `Reopen ${f.title}` : `Mark ${f.title} done`} hitSlop={8}
          style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: f.done ? c.success : c.borderStrong, backgroundColor: f.done ? c.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {f.done ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
        </Pressy>
        <View style={{ flex: 1, gap: 3 }}>
          <T v="bodyStrong" numberOfLines={2} color={f.done ? c.textMuted : c.text} style={f.done ? { textDecorationLine: 'line-through' } : undefined}>{f.title}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={am.icon} size={13} color={am.color(c)} />
            <T v="caption" color={c.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{customerName ? `${customerName} · ` : ''}{Fmt.when(f.dueAt)}</T>
          </View>
        </View>
        {!f.done ? (overdue ? <Badge label={Fmt.dueLabel(f.dueAt)} tone="danger" icon="alert-circle" /> : f.priority === 'high' ? <Badge label="High" tone="danger" /> : null) : null}
      </View>
    </Card>
  );
});

// ───────── Lead card ─────────
export const LeadCard = memo(function LeadCard({ lead, onPress, onLongPress, compact }: { lead: Lead; onPress: () => void; onLongPress?: () => void; compact?: boolean }) {
  const { c } = useTheme();
  const sm = STAGE_META[lead.stage];
  return (
    <Card onPress={onPress} onLongPress={onLongPress} pad="md" style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Avatar name={lead.name} size={compact ? 36 : 44} color={sm.color(c)} />
        <View style={{ flex: 1 }}>
          <T v="bodyStrong" numberOfLines={1}>{lead.name}</T>
          <T v="caption" color={c.textMuted} numberOfLines={1}>{SOURCE_LABEL[lead.source] ?? lead.source}{lead.expectedClose ? ` · closes ${Fmt.date(lead.expectedClose, true)}` : ''}</T>
        </View>
        <T v="bodyStrong" color={lead.stage === 'lost' ? c.textFaint : c.text}>{Fmt.money(lead.value)}</T>
      </View>
      {!compact ? <View style={{ flexDirection: 'row' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: sm.color(c) + '22' }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sm.color(c) }} /><T v="caption" color={c.text} style={{ fontFamily: 'Inter_600SemiBold' }}>{sm.label}</T></View></View> : null}
    </Card>
  );
});

// ───────── Timeline ─────────
export function TimelineItem({ a, last, onLongPress }: { a: Activity; last?: boolean; onLongPress?: () => void }) {
  const { c } = useTheme();
  const m = ACTIVITY_META[a.type] ?? ACTIVITY_META.note; const col = m.color(c);
  return (
    <Pressy onLongPress={onLongPress} scale={0.99} haptics="none" accessibilityRole="button" accessibilityLabel={`${m.label}: ${a.title}, ${Fmt.dateTime(a.at)}`} style={{ flexDirection: 'row', gap: space.md }}>
      <View style={{ alignItems: 'center', width: 36 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: col + '24', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={m.icon} size={18} color={col} /></View>
        {!last ? <View style={{ flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4, borderRadius: 1 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T v="bodyStrong" style={{ flex: 1 }}>{a.title || m.label}</T>
          {a.amount ? <T v="bodyStrong" color={c.success}>{Fmt.money(a.amount)}</T> : null}
        </View>
        {a.body ? <T v="body" color={c.textMuted} style={{ marginTop: 2 }}>{a.body}</T> : null}
        <T v="caption" color={c.textFaint} style={{ marginTop: 4 }}>{m.label} · {Fmt.when(a.at)}</T>
      </View>
    </Pressy>
  );
}

// ───────── Log activity sheet ─────────
export function LogActivitySheet({ visible, onClose, onSave, initialType = 'call' }: { visible: boolean; onClose: () => void; onSave: (a: { type: ActivityType; title: string; body: string; amount: number }) => Promise<void> | void; initialType?: ActivityType }) {
  const [type, setType] = useState<ActivityType>(initialType);
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [amount, setAmount] = useState('');
  const money = type === 'sale' || type === 'payment';
  const reset = () => { setTitle(''); setBody(''); setAmount(''); setType(initialType); };
  const save = async () => { await onSave({ type, title: title.trim() || ACTIVITY_META[type].label, body: body.trim(), amount: money ? Number(amount.replace(/[^\d.]/g, '')) || 0 : 0 }); reset(); onClose(); };
  return (
    <Sheet visible={visible} onClose={onClose} title="Log activity" tall footer={<Button block label="Save to timeline" icon="checkmark" onPress={save} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
        {ACTIVITY_TYPES.map((t) => <Chip key={t} label={ACTIVITY_META[t].label} icon={ACTIVITY_META[t].icon} selected={type === t} onPress={() => setType(t)} />)}
      </View>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder={`e.g. ${type === 'call' ? 'Discussed pricing' : type === 'sale' ? 'Invoice #1042' : 'What happened?'}`} />
      {money ? <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" icon="cash-outline" /> : null}
      <Field label="Details (optional)" value={body} onChangeText={setBody} multiline placeholder="Add context for later…" />
    </Sheet>
  );
}
