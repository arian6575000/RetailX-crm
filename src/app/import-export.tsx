import React, { useState } from 'react';
import { View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Contacts from 'expo-contacts';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { Repo } from '../db/repo';
import { customersToCsv, parseCustomerCsv, ImportRow } from '../lib/csv';
import { space } from '../lib/theme';
import { Badge, Button, Card, Header, IconTile, Screen, T } from '../ui/kit';
import { Sheet } from '../ui/Sheet';
import { useCan } from '../license/LicenseGate';
import { LockedScreen } from '../ui/Locked';
import { haptic } from '../lib/haptics';

export default function ImportExport() {
  const can = useCan();
  const { c } = useTheme();
  const { bump, toast } = useApp();
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState<{ rows: ImportRow[]; skipped: number } | null>(null);
  if (!can('data.importExport')) return <LockedScreen title="Import & export" feature="Import and export" />;

  const exportCsv = async () => {
    setBusy('export');
    try {
      const [list, groups] = await Promise.all([Repo.listCustomers(), Repo.listGroups()]);
      if (!list.length) { toast('There are no customers to export', 'error'); return; }
      const gname = (id: number | null) => groups.find((g) => g.id === id)?.name ?? '';
      const f = new File(Paths.cache, `retailx-customers-${new Date().toISOString().slice(0, 10)}.csv`);
      if (f.exists) f.delete();
      f.create(); f.write(customersToCsv(list, gname));
      if (!(await Sharing.isAvailableAsync())) { toast('Sharing is not available on this device', 'error'); return; }
      await Sharing.shareAsync(f.uri, { mimeType: 'text/csv', dialogTitle: 'Export customers' });
    } catch { toast('Export failed', 'error'); } finally { setBusy(''); }
  };

  const pickCsv = async () => {
    setBusy('import');
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      const text = await new File(r.assets[0].uri).text();
      const p = parseCustomerCsv(text);
      if (p.error === 'empty') { toast('That file is empty', 'error'); return; }
      if (p.error === 'noName') { toast('No “name” column found. Use the exported file as a template.', 'error'); return; }
      setPreview({ rows: p.rows, skipped: p.skipped });
    } catch { toast('Could not read that file', 'error'); } finally { setBusy(''); }
  };

  const importRows = async (rows: ImportRow[], skipped = 0) => {
    const phones = await Repo.existingPhones();
    const groups = await Repo.listGroups();
    let added = 0, dup = 0;
    for (const r of rows) {
      const digits = r.phone.replace(/\D/g, '');
      if (digits && phones.has(digits)) { dup++; continue; }
      let gid: number | null = null;
      if (r.group) { const g = groups.find((x) => x.name.toLowerCase() === r.group.toLowerCase()); gid = g ? g.id : await Repo.saveGroup({ name: r.group, color: '#4338CA', icon: 'folder' }).then((id) => { groups.push({ id, name: r.group, color: '#4338CA', icon: 'folder', createdAt: 0 }); return id; }); }
      const tagIds: number[] = []; for (const t of r.tags) tagIds.push(await Repo.upsertTag(t));
      await Repo.saveCustomer({ name: r.name, company: r.company, phone: r.phone, email: r.email, city: r.city, address: r.address, status: r.status, groupId: gid, notes: r.notes }, tagIds);
      if (digits) phones.add(digits); added++;
    }
    bump(); haptic.success(); toast(`${added} imported${dup ? ` · ${dup} duplicate${dup > 1 ? 's' : ''} skipped` : ''}${skipped ? ` · ${skipped} invalid` : ''}`, 'success');
  };

  const importContacts = async () => {
    setBusy('contacts');
    try {
      const p = await Contacts.requestPermissionsAsync();
      if (!p.granted) { toast('Contacts permission was not granted', 'error'); return; }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Company] });
      const rows: ImportRow[] = data.filter((x) => x.name?.trim()).map((x) => ({ name: x.name!.trim(), company: x.company ?? '', phone: x.phoneNumbers?.[0]?.number ?? '', email: x.emails?.[0]?.email ?? '', city: '', address: '', status: 'active', group: '', tags: [], notes: '' }));
      if (!rows.length) { toast('No contacts found on this phone', 'error'); return; }
      setPreview({ rows, skipped: 0 });
    } catch { toast('Could not read contacts', 'error'); } finally { setBusy(''); }
  };

  const Block = ({ icon, color, title, text, label, onPress, id, variant = 'soft' }: { icon: any; color: string; title: string; text: string; label: string; onPress: () => void; id: string; variant?: 'soft' | 'primary' }) => (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}><IconTile icon={icon} color={color} /><View style={{ flex: 1 }}><T v="bodyStrong">{title}</T><T v="caption" color={c.textMuted}>{text}</T></View></View>
      <Button label={label} variant={variant} block onPress={onPress} loading={busy === id} disabled={!!busy} />
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Import & export" subtitle="Move customers in and out" back />
      <Screen>
        <View style={{ gap: space.md }}>
          <Block id="export" icon="share" color={c.primary} title="Export customers (CSV)" text="Opens in Excel or Google Sheets. Includes groups and tags." label="Export CSV" onPress={exportCsv} variant="primary" />
          <Block id="import" icon="document-attach" color={c.success} title="Import from CSV" text="Needs a “name” column. Phone numbers already in your list are skipped." label="Choose CSV file" onPress={pickCsv} />
          <Block id="contacts" icon="person-circle" color={c.accent} title="Import from phone contacts" text="Review before anything is added." label="Choose from contacts" onPress={importContacts} />
        </View>
      </Screen>
      <Sheet visible={!!preview} onClose={() => setPreview(null)} title="Ready to import" tall footer={<View style={{ flexDirection: 'row', gap: space.md }}><Button variant="ghost" label="Cancel" onPress={() => setPreview(null)} /><Button block icon="download" label={`Import ${preview?.rows.length ?? 0}`} loading={busy === 'run'} onPress={async () => { if (!preview) return; setBusy('run'); try { await importRows(preview.rows, preview.skipped); setPreview(null); } finally { setBusy(''); } }} /></View>}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: space.md }}><Badge tone="success" label={`${preview?.rows.length ?? 0} customers`} />{preview?.skipped ? <Badge tone="warning" label={`${preview.skipped} invalid rows skipped`} /> : null}</View>
        {preview?.rows.slice(0, 8).map((r, i) => <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}><T v="bodyStrong" numberOfLines={1}>{r.name}</T><T v="caption" color={c.textMuted} numberOfLines={1}>{[r.company, r.phone, r.city].filter(Boolean).join(' · ') || 'No details'}</T></View>)}
        {preview && preview.rows.length > 8 ? <T v="caption" color={c.textMuted} style={{ marginTop: space.md }}>and {preview.rows.length - 8} more…</T> : null}
      </Sheet>
    </View>
  );
}
