import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { useData } from '../../lib/hooks';
import { Repo } from '../../db/repo';
import { Attachment, Note } from '../../db/types';
import { dial, mailTo, sms, whatsapp } from '../../lib/contact';
import { deleteFiles, fileUri, isImage, openFile, pickDocuments, pickPhotos } from '../../lib/files';
import { Fmt } from '../../lib/format';
import { printCustomerPdf } from '../../lib/pdf';
import { radius, space } from '../../lib/theme';
import { Avatar, Badge, Button, Card, EmptyState, Field, IconButton, IconTile, ListSkeleton, Pressy, Row, Screen, Segmented, Skeleton, T } from '../../ui/kit';
import { ActionMenu, Sheet } from '../../ui/Sheet';
import { NoteSheet } from '../../ui/NoteSheet';
import { FollowUpCard, LeadCard, LogActivitySheet, TimelineItem } from '../../ui/parts';
import { STATUS_META } from '../../ui/meta';
import { useCan } from '../../license/LicenseGate';

type Tab = 'overview' | 'timeline' | 'notes' | 'files';

export default function CustomerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = Number(id);
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, toast, confirm, bump } = useApp();
  const can = useCan();
  const [tab, setTab] = useState<Tab>('overview');
  const [menu, setMenu] = useState(false);
  const [log, setLog] = useState(false);
  const [noteEdit, setNoteEdit] = useState<Partial<Note> | null>(null);
  const [fileMenu, setFileMenu] = useState(false);

  const { data, loading } = useData(async () => {
    const [customer, group, activities, followups, notes, files, leads] = await Promise.all([
      Repo.getCustomer(cid), Repo.listGroups(), Repo.listActivities({ customerId: cid }), Repo.listFollowUps({ customerId: cid }), Repo.listNotes(cid), Repo.listAttachments({ customerId: cid }),
      Repo.listLeads(),
    ]);
    return { customer, group: group.find((g) => g.id === customer?.groupId), activities, followups, notes, files, leads: leads.filter((l) => l.customerId === cid) };
  }, [cid]);

  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, paddingTop: insets.top + 60, gap: space.lg }}><Skeleton h={200} r={radius.xl} /><ListSkeleton rows={3} /></View>;
  const cu = data?.customer;
  if (!cu) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><EmptyState icon="person-remove" title="Customer not found" message="This customer may have been deleted." action="Go back" onAction={() => router.back()} /></View>;

  const sales = data!.activities.filter((a) => a.type === 'sale').reduce((s, a) => s + a.amount, 0);
  const paid = data!.activities.filter((a) => a.type === 'payment').reduce((s, a) => s + a.amount, 0);
  const lastContact = data!.activities.find((a) => a.type !== 'note' && a.type !== 'sale' && a.type !== 'payment');
  const openFu = data!.followups.filter((f) => !f.done);
  const st = STATUS_META[cu.status];

  const act = async (fn: () => Promise<boolean>, type: 'call' | 'whatsapp' | 'sms' | 'email') => {
    const ok = await fn();
    if (!ok) { toast('No app available for that action', 'error'); return; }
    await Repo.addActivity({ customerId: cid, type, title: type === 'call' ? 'Outgoing call' : type === 'whatsapp' ? 'WhatsApp message' : type === 'sms' ? 'SMS sent' : 'Email sent' });
    bump();
  };
  const remove = async () => {
    if (!(await confirm(`Delete ${cu.name}? Timeline, notes, files and follow-ups are deleted too.`, { title: 'Delete customer', danger: true, okLabel: 'Delete' }))) return;
    deleteFiles(data!.files.map((f) => f.file)); await Repo.deleteCustomer(cid); bump(); toast('Customer deleted'); router.back();
  };
  const addFiles = async (kind: 'camera' | 'gallery' | 'doc') => {
    try {
      const picked = kind === 'doc' ? await pickDocuments() : await pickPhotos(kind);
      for (const p of picked) await Repo.addAttachment({ customerId: cid, ...p });
      if (picked.length) { bump(); toast(`${picked.length} file${picked.length > 1 ? 's' : ''} added`, 'success'); }
    } catch (e: any) { toast(String(e?.message || 'Could not add file'), 'error'); }
  };
  const removeFile = async (a: Attachment) => { if (await confirm(`Remove ${a.name}?`, { danger: true, okLabel: 'Remove' })) { deleteFiles([await Repo.deleteAttachment(a.id)]); bump(); } };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen pad={false} contentStyle={{ paddingBottom: 40 }}>
        {/* Identity header */}
        <LinearGradient colors={[c.gradientA, c.gradientB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + space.sm, paddingBottom: 72, paddingHorizontal: space.lg, borderBottomLeftRadius: radius.xl + 8, borderBottomRightRadius: radius.xl + 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -space.sm }}>
            <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} tone="plain" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} size={24} />
            <IconButton icon="ellipsis-horizontal" label="More actions" onPress={() => setMenu(true)} style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} />
          </View>
          <View style={{ alignItems: 'center', marginTop: space.sm }}>
            <View style={{ padding: 4, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.22)' }}><View style={{ borderRadius: 30, backgroundColor: c.surface, padding: 4 }}><Avatar name={cu.name} size={80} /></View></View>
            <T v="title" color="#FFFFFF" align="center" style={{ marginTop: space.md }}>{cu.name}</T>
            {cu.company ? <T v="body" color="rgba(255,255,255,0.85)" align="center">{cu.company}</T> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Badge label={st.label} tone={st.tone} icon={st.icon} />
              {data!.group ? <Badge label={data!.group.name} tone="primary" icon="folder" /> : null}
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions overlapping the header */}
        <View style={{ paddingHorizontal: space.lg, marginTop: -40 }}>
          <Card raised pad="md" style={{ flexDirection: 'row' }}>
            {([
              { icon: 'call', label: 'Call', on: () => act(() => dial(cu.phone), 'call'), show: !!cu.phone },
              { icon: 'logo-whatsapp', label: 'WhatsApp', on: () => act(() => whatsapp(cu.phone, settings.countryCode), 'whatsapp'), show: !!cu.phone },
              { icon: 'chatbubble-ellipses', label: 'SMS', on: () => act(() => sms(cu.phone), 'sms'), show: !!cu.phone },
              { icon: 'mail', label: 'Email', on: () => act(() => mailTo(cu.email), 'email'), show: !!cu.email },
              { icon: 'create', label: 'Log', on: () => setLog(true), show: true },
            ] as const).filter((x) => x.show).map((x) => (
              <Pressy key={x.label} onPress={x.on} haptics="light" accessibilityLabel={x.label} style={{ flex: 1, alignItems: 'center', gap: 6, minHeight: 56 }}>
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={x.icon} size={22} color={c.onPrimarySoft} /></View>
                <T v="caption" color={c.textMuted}>{x.label}</T>
              </Pressy>
            ))}
          </Card>

          <View style={{ marginTop: space.lg }}>
            <Segmented<Tab> value={tab} onChange={setTab} options={[{ key: 'overview', label: 'Overview' }, { key: 'timeline', label: 'Timeline' }, { key: 'notes', label: 'Notes' }, { key: 'files', label: 'Files' }]} />
          </View>

          {tab === 'overview' ? (
            <View style={{ gap: space.lg, marginTop: space.lg }}>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Stat label="Total sales" value={Fmt.money(sales)} tone={c.success} />
                <Stat label="Balance due" value={Fmt.money(Math.max(0, sales - paid))} tone={sales > paid ? c.warning : c.textFaint} />
              </View>
              <Card>
                <Row icon="call" title={cu.phone || 'No phone'} subtitle="Phone" last={!cu.email && !cu.city && !cu.address} onPress={cu.phone ? () => dial(cu.phone) : undefined} />
                {cu.email ? <Row icon="mail" iconColor={c.secondary} title={cu.email} subtitle="Email" onPress={() => mailTo(cu.email)} last={!cu.city && !cu.address} /> : null}
                {cu.city || cu.address ? <Row icon="location" iconColor={c.accent} title={[cu.address, cu.city].filter(Boolean).join(', ')} subtitle="Address" last /> : null}
              </Card>
              {cu.tags?.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{cu.tags.map((t) => <Badge key={t.id} label={t.name} tone="primary" icon="pricetag" />)}</View> : null}
              <Card><View style={{ flexDirection: 'row' }}>
                <Mini label="Interactions" value={String(data!.activities.length)} />
                <Mini label="Last contact" value={lastContact ? Fmt.date(lastContact.at, true) : '—'} />
                <Mini label="Customer since" value={Fmt.date(cu.createdAt, true)} />
              </View></Card>
              {cu.notes ? <Card><T v="overline" color={c.textMuted}>About</T><T v="body" style={{ marginTop: 6 }}>{cu.notes}</T></Card> : null}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}>
                  <T v="heading">Follow-ups</T>
                  <Pressy onPress={() => router.push({ pathname: '/followup/edit', params: { customerId: String(cid) } })} style={{ minHeight: 44, justifyContent: 'center' }}><T v="label" color={c.primary}>+ Schedule</T></Pressy>
                </View>
                {openFu.length ? <View style={{ gap: space.sm }}>{openFu.slice(0, 3).map((f) => <FollowUpCard key={f.id} f={f} onPress={() => router.push({ pathname: '/followup/edit', params: { id: String(f.id) } })} onToggle={async () => { await Repo.completeFollowUp(f.id); bump(); }} />)}</View>
                  : <Card><T v="body" color={c.textMuted}>Nothing scheduled. Plan the next touchpoint so this customer doesn’t go quiet.</T></Card>}
              </View>
              {data!.leads.length ? <View><T v="heading" style={{ marginBottom: space.sm }}>Deals</T><View style={{ gap: space.sm }}>{data!.leads.map((l) => <LeadCard key={l.id} lead={l} onPress={() => router.push({ pathname: '/lead/edit', params: { id: String(l.id) } })} />)}</View></View> : null}
            </View>
          ) : null}

          {tab === 'timeline' ? (
            <View style={{ marginTop: space.lg }}>
              {data!.activities.length ? <Card>{data!.activities.map((a, i) => <TimelineItem key={a.id} a={a} last={i === data!.activities.length - 1} onLongPress={async () => { if (await confirm('Delete this entry from the timeline?', { danger: true, okLabel: 'Delete' })) { await Repo.deleteActivity(a.id); bump(); } }} />)}</Card>
                : <EmptyState icon="time" title="No activity yet" message="Calls, messages, sales and payments you log appear here as a timeline." action="Log first activity" onAction={() => setLog(true)} />}
            </View>
          ) : null}

          {tab === 'notes' ? (
            <View style={{ marginTop: space.lg, gap: space.md }}>
              <Button label="New note" icon="add" variant="soft" block onPress={() => setNoteEdit({ customerId: cid, title: '', body: '' })} />
              {data!.notes.length ? data!.notes.map((n) => (
                <Card key={n.id} onPress={() => setNoteEdit(n)} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {n.pinned ? <Ionicons name="pin" size={14} color={c.warning} /> : null}
                    <T v="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{n.title || 'Untitled note'}</T>
                    <T v="caption" color={c.textFaint}>{Fmt.date(n.updatedAt, true)}</T>
                  </View>
                  <T v="body" color={c.textMuted} numberOfLines={3}>{n.body}</T>
                </Card>
              )) : <EmptyState icon="document-text" title="No notes" message="Keep preferences, agreements and reminders for this customer in one place." />}
            </View>
          ) : null}

          {tab === 'files' ? (
            <View style={{ marginTop: space.lg, gap: space.md }}>
              {can('notes.attachments') ? <Button label="Add photo or file" icon="attach" variant="soft" block onPress={() => setFileMenu(true)} /> : null}
              {data!.files.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                  {data!.files.map((a) => (
                    <Card key={a.id} pad={0} onPress={() => openFile(a.file, a.mime).catch((e) => toast(String(e.message), 'error'))} onLongPress={() => removeFile(a)} style={{ width: '47.5%', overflow: 'hidden' }}>
                      {isImage(a.mime) ? <Image source={{ uri: fileUri(a.file) }} style={{ width: '100%', height: 110 }} accessibilityLabel={a.name} /> : <View style={{ height: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt }}><Ionicons name="document" size={36} color={c.textFaint} /></View>}
                      <View style={{ padding: space.sm }}><T v="label" numberOfLines={1}>{a.name}</T><T v="caption" color={c.textFaint}>{Fmt.bytes(a.size)}</T></View>
                    </Card>
                  ))}
                </View>
              ) : <EmptyState icon="images" title="No files" message="Attach photos, quotes, contracts or any document. Long-press a file to remove it." />}
            </View>
          ) : null}
        </View>
      </Screen>

      <LogActivitySheet visible={log} onClose={() => setLog(false)} onSave={async (a) => { await Repo.addActivity({ customerId: cid, ...a }); bump(); toast('Added to timeline', 'success'); setTab('timeline'); }} />
      <NoteSheet note={noteEdit} onClose={() => setNoteEdit(null)} onSave={async (n) => { await Repo.saveNote(n as any); bump(); toast('Note saved', 'success'); }} onDelete={async (n) => { deleteFiles(await Repo.deleteNote(n.id!)); bump(); }} />
      <ActionMenu visible={fileMenu} onClose={() => setFileMenu(false)} title="Add to files" actions={[
        { label: 'Take a photo', icon: 'camera', onPress: () => addFiles('camera') }, { label: 'Choose from gallery', icon: 'images', onPress: () => addFiles('gallery') }, { label: 'Pick a document', icon: 'document', onPress: () => addFiles('doc') },
      ]} />
      <ActionMenu visible={menu} onClose={() => setMenu(false)} title={cu.name} actions={[
        { label: 'Edit customer', icon: 'create', onPress: () => router.push({ pathname: '/customer/edit', params: { id: String(cid) } }) },
        { label: 'Schedule follow-up', icon: 'alarm', onPress: () => router.push({ pathname: '/followup/edit', params: { customerId: String(cid) } }) },
        { label: 'New deal', icon: 'flag', onPress: () => router.push({ pathname: '/lead/edit', params: { customerId: String(cid) } }) },
        ...(can('print.reports') ? [{ label: 'Share profile as PDF', icon: 'document-text' as const, onPress: () => printCustomerPdf(cu, data!.activities, openFu, settings).catch((e) => toast(String(e.message), 'error')) }] : []),
        { label: cu.status === 'vip' ? 'Remove VIP status' : 'Mark as VIP', icon: 'star', onPress: async () => { await Repo.setCustomerStatus(cid, cu.status === 'vip' ? 'active' : 'vip'); bump(); } },
        { label: 'Delete customer', icon: 'trash', danger: true, onPress: remove },
      ]} />
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  const { c } = useTheme();
  return <Card style={{ flex: 1 }} pad="md"><T v="caption" color={c.textMuted}>{label}</T><T v="title" color={tone} numberOfLines={1} style={{ marginTop: 2 }}>{value}</T></Card>;
}
function Mini({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return <View style={{ flex: 1, alignItems: 'center' }}><T v="bodyStrong">{value}</T><T v="caption" color={c.textMuted}>{label}</T></View>;
}
