import React, { useState } from 'react';
import { View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { Repo } from '../db/repo';
import { exportAll, importAll, validateBackup } from '../db/backupCore';
import { decryptBackup, encryptBackup, isEncryptedBackup } from '../lib/backupCrypto';
import { cleanOrphanFiles, fileIO } from '../lib/files';
import { Fmt } from '../lib/format';
import { space } from '../lib/theme';
import { Badge, Button, Card, Credit, Field, Header, IconTile, Screen, T } from '../ui/kit';
import { Sheet } from '../ui/Sheet';
import { useCan } from '../license/LicenseGate';
import { LockedScreen } from '../ui/Locked';
import { haptic } from '../lib/haptics';

export default function Backup() {
  const can = useCan();
  const { c } = useTheme();
  const { settings, bump, toast, confirm, reloadSettings } = useApp();
  const [busy, setBusy] = useState('');
  const [pass, setPass] = useState(''); const [pass2, setPass2] = useState('');
  const [makeOpen, setMakeOpen] = useState(false);
  const [restore, setRestore] = useState<{ payload: any; encrypted: any | null } | null>(null);
  const [restorePass, setRestorePass] = useState(''); const [err, setErr] = useState('');
  if (!can('data.backup')) return <LockedScreen title="Backup & restore" feature="Backup and restore" />;

  const create = async () => {
    if (pass && pass.length < 6) { setErr('Use at least 6 characters'); return; }
    if (pass !== pass2) { setErr('Passwords do not match'); return; }
    setBusy('make');
    try {
      const json = JSON.stringify(await exportAll(fileIO));
      const out = pass ? encryptBackup(json, pass) : json;
      const f = new File(Paths.cache, `retailx-crm-backup-${new Date().toISOString().slice(0, 10)}.json`);
      if (f.exists) f.delete();
      f.create(); f.write(out);
      if (!(await Sharing.isAvailableAsync())) { toast('Sharing is not available on this device', 'error'); return; }
      await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Save backup' });
      await Repo.markBackup(); await reloadSettings(); haptic.success();
      setMakeOpen(false); setPass(''); setPass2(''); setErr(''); toast('Backup created', 'success');
    } catch { toast('Backup failed', 'error'); } finally { setBusy(''); }
  };

  const pick = async () => {
    setBusy('pick');
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      const parsed = JSON.parse(await new File(r.assets[0].uri).text());
      if (isEncryptedBackup(parsed)) { setRestore({ payload: null, encrypted: parsed }); return; }
      const bad = validateBackup(parsed);
      if (bad) { toast(bad, 'error'); return; }
      setRestore({ payload: parsed, encrypted: null });
    } catch { toast('That is not a RetailX CRM backup file', 'error'); } finally { setBusy(''); }
  };

  const unlockBackup = () => {
    try {
      const p = decryptBackup(restore!.encrypted, restorePass);
      const bad = validateBackup(p);
      if (bad) { setErr(bad); return; }
      setRestore({ payload: p, encrypted: null }); setRestorePass(''); setErr('');
    } catch { setErr('Wrong password'); }
  };

  const run = async (mode: 'merge' | 'replace') => {
    if (!restore?.payload) return;
    if (mode === 'replace' && !(await confirm('Replace ALL current data with this backup? This cannot be undone.', { title: 'Replace everything', danger: true, okLabel: 'Replace' }))) return;
    setBusy('run');
    try {
      const sum = await importAll(restore.payload, mode, fileIO);
      await cleanOrphanFiles(); await reloadSettings(); bump(); haptic.success();
      setRestore(null);
      toast(`Restored ${sum.customers} customers, ${sum.leads} leads, ${sum.followups} follow-ups`, 'success');
    } catch { toast('Restore failed. Your data is unchanged.', 'error'); } finally { setBusy(''); }
  };

  const p = restore?.payload;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Backup & restore" subtitle="Your data never leaves this phone unless you share it" back />
      <Screen>
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <IconTile icon="shield-checkmark" color={settings.lastBackupAt ? c.success : c.warning} />
              <View style={{ flex: 1 }}><T v="bodyStrong">{settings.lastBackupAt ? 'Last backup' : 'No backup yet'}</T><T v="caption" color={c.textMuted}>{settings.lastBackupAt ? Fmt.when(settings.lastBackupAt) : 'Back up regularly. If this phone is lost, so is your data.'}</T></View>
              {!settings.lastBackupAt ? <Badge tone="warning" label="Recommended" /> : null}
            </View>
          </Card>
          <Card style={{ gap: space.md }}>
            <T v="bodyStrong">Create backup</T>
            <T v="caption" color={c.textMuted}>Customers, leads, follow-ups, notes and attachments in one file. Protect it with a password and save it to Drive, WhatsApp or a computer.</T>
            <Button icon="cloud-upload" label="Create backup" block onPress={() => setMakeOpen(true)} disabled={!!busy} />
          </Card>
          <Card style={{ gap: space.md }}>
            <T v="bodyStrong">Restore from file</T>
            <T v="caption" color={c.textMuted}>Merge adds the backup to your current data. Replace swaps everything for the backup.</T>
            <Button variant="soft" icon="cloud-download" label="Choose backup file" block onPress={pick} loading={busy === 'pick'} disabled={!!busy} />
          </Card>
          <Credit />
        </View>
      </Screen>

      <Sheet visible={makeOpen} onClose={() => { setMakeOpen(false); setErr(''); }} title="Create backup" footer={<Button block icon="lock-closed" label={pass ? 'Create encrypted backup' : 'Create backup'} onPress={create} loading={busy === 'make'} />}>
        <Field label="Password (recommended)" value={pass} onChangeText={(v) => { setPass(v); setErr(''); }} secureTextEntry placeholder="Leave empty for no encryption" icon="key-outline" autoCapitalize="none" />
        {pass ? <Field label="Repeat password" value={pass2} onChangeText={(v) => { setPass2(v); setErr(''); }} secureTextEntry icon="key-outline" autoCapitalize="none" error={err || undefined} /> : null}
        {pass ? <T v="caption" color={c.warning}>There is no way to recover this password. Without it the backup cannot be opened.</T> : null}
        {err && !pass ? <T v="caption" color={c.danger}>{err}</T> : null}
      </Sheet>

      <Sheet visible={!!restore} onClose={() => { setRestore(null); setErr(''); setRestorePass(''); }} title={restore?.encrypted ? 'Enter backup password' : 'Restore backup'} footer={restore?.encrypted
        ? <Button block label="Unlock backup" icon="lock-open" onPress={unlockBackup} disabled={!restorePass} />
        : <View style={{ gap: space.sm }}><Button block icon="git-merge" label="Merge into current data" onPress={() => run('merge')} loading={busy === 'run'} /><Button block variant="danger" icon="swap-horizontal" label="Replace all data" onPress={() => run('replace')} disabled={busy === 'run'} /></View>}>
        {restore?.encrypted ? <Field label="Password" value={restorePass} onChangeText={(v) => { setRestorePass(v); setErr(''); }} secureTextEntry icon="key-outline" autoCapitalize="none" error={err || undefined} autoFocus /> : p ? (
          <View style={{ gap: 6 }}>
            <T v="body" color={c.textMuted}>Backup from {p.exportedAt ? Fmt.date(new Date(p.exportedAt).getTime(), true) : 'unknown date'}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Badge tone="primary" label={`${p.data?.customers?.length ?? 0} customers`} /><Badge tone="secondary" label={`${p.data?.leads?.length ?? 0} leads`} /><Badge tone="accent" label={`${p.data?.followups?.length ?? 0} follow-ups`} /><Badge tone="neutral" label={`${p.data?.notes?.length ?? 0} notes`} />
            </View>
          </View>) : null}
      </Sheet>
    </View>
  );
}
