import React, { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { Repo } from '../db/repo';
import { Settings as S } from '../db/types';
import { biometricAvailable, biometricEnabled, hasPin, removePin, setBiometric, setPin } from '../lib/lock';
import { ensureNotifyPermission } from '../lib/notify';
import { cleanOrphanFiles } from '../lib/files';
import { getDeviceId } from '../license/deviceId';
import { useLicense } from '../license/LicenseGate';
import { APP_NAME } from '../lib/brand';
import { space } from '../lib/theme';
import { Button, Card, Credit, Field, Header, Row, Screen, SectionHeader, Segmented, Stepper, T, ToggleRow } from '../ui/kit';
import { OptionSheet, Sheet } from '../ui/Sheet';
import { haptic } from '../lib/haptics';

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

export default function Settings() {
  const { c } = useTheme();
  const { settings, saveSettings, toast, confirm, bump, refreshReminders, reloadSettings } = useApp();
  const lic = useLicense();
  const [biz, setBiz] = useState(false);
  const [draft, setDraft] = useState<S>(settings);
  const [hourOpen, setHourOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPinV] = useState(''); const [pin2, setPin2] = useState(''); const [pinErr, setPinErr] = useState('');
  const [pinOn, setPinOn] = useState(false); const [bioOk, setBioOk] = useState(false); const [bioOn, setBioOn] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  const loadSec = async () => { setPinOn(await hasPin()); setBioOk(await biometricAvailable()); setBioOn(await biometricEnabled()); };
  useEffect(() => { loadSec(); getDeviceId().then(setDeviceId).catch(() => {}); }, []);
  const patch = (p: Partial<S>) => saveSettings({ ...settings, ...p });

  const savePin = async () => {
    if (!/^\d{4,6}$/.test(pin)) { setPinErr('Use 4 to 6 digits'); return; }
    if (pin !== pin2) { setPinErr('PINs do not match'); return; }
    await setPin(pin); setPinOpen(false); setPinV(''); setPin2(''); setPinErr(''); await loadSec(); haptic.success(); toast('PIN lock is on', 'success');
  };
  const eraseAll = async () => {
    if (!(await confirm('Delete every customer, lead, follow-up, note and file on this phone? This cannot be undone. Create a backup first.', { title: 'Erase all data', danger: true, okLabel: 'Erase everything' }))) return;
    await Repo.eraseAll(); await cleanOrphanFiles(); await reloadSettings(); bump(); refreshReminders(); toast('All data erased');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Settings" subtitle="Make RetailX CRM yours" back />
      <Screen>
        <SectionHeader title="Appearance" />
        <Card style={{ gap: space.md }}>
          <Segmented<S['theme']> value={settings.theme} onChange={(theme) => patch({ theme })} options={[{ key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }, { key: 'system', label: 'System' }]} />
          <ToggleRow label="Haptic feedback" value={settings.haptics} onChange={(haptics) => patch({ haptics })} />
        </Card>

        <SectionHeader title="Reminders" />
        <Card pad={0}>
          <View style={{ padding: space.lg }}>
            <ToggleRow label="Follow-up reminders" value={settings.notifyEnabled} onChange={async (on) => {
              if (on && !(await ensureNotifyPermission())) { toast('Allow notifications in system settings to get reminders', 'error'); return; }
              await patch({ notifyEnabled: on }); refreshReminders();
            }} />
          </View>
          <Row icon="time" iconColor={c.warning} title="Reminder time" subtitle={hourLabel(settings.reminderHour)} chevron onPress={() => setHourOpen(true)} />
          <Row icon="calendar" iconColor={c.primary} title="Default follow-up" subtitle={`${settings.defaultFollowUpDays} day${settings.defaultFollowUpDays === 1 ? '' : 's'} after today`} right={<Stepper label="follow-up days" min={1} max={60} value={settings.defaultFollowUpDays} onChange={(d) => patch({ defaultFollowUpDays: d })} />} last />
        </Card>

        <SectionHeader title="Security" />
        <Card pad={0}>
          <Row icon="keypad" iconColor={c.primary} title="PIN lock" subtitle={pinOn ? 'On. Locks when you leave the app' : 'Off'} chevron={!pinOn} onPress={() => (pinOn ? undefined : setPinOpen(true))} right={pinOn ? <Button size="sm" variant="soft" label="Remove" onPress={async () => { if (await confirm('Turn off PIN lock?', { okLabel: 'Turn off' })) { await removePin(); await loadSec(); toast('PIN lock is off'); } }} /> : undefined} last={!pinOn || !bioOk} />
          {pinOn && bioOk ? <View style={{ padding: space.lg }}><ToggleRow label="Unlock with fingerprint or face" value={bioOn} onChange={async (v) => { await setBiometric(v); setBioOn(v); }} /></View> : null}
        </Card>

        <SectionHeader title="Business" />
        <Card pad={0}>
          <Row icon="business" iconColor={c.secondary} title={settings.businessName} subtitle={[settings.ownerName, settings.phone].filter(Boolean).join(' · ') || 'Tap to add your details'} chevron onPress={() => { setDraft(settings); setBiz(true); }} />
          <Row icon="cash" iconColor={c.success} title="Currency & country code" subtitle={`${settings.currency} · +${settings.countryCode}`} chevron onPress={() => { setDraft(settings); setBiz(true); }} last />
        </Card>

        <SectionHeader title="License" />
        <Card pad={0}>
          <Row icon="ribbon" iconColor={c.accent} title={lic?.payload.plan_name || 'Licensed'} subtitle={lic ? `${lic.payload.client_name} · ${lic.payload.is_lifetime ? 'Lifetime' : `Expires ${lic.payload.expiry_date}`}` : undefined} />
          <Row icon="finger-print" iconColor={c.textMuted} title="Device ID" subtitle={deviceId || '…'} right={<Button size="sm" variant="soft" label="Share" onPress={() => Share.share({ message: deviceId })} />} last />
        </Card>

        <SectionHeader title="Danger zone" />
        <Card pad={0}><Row icon="trash" danger title="Erase all data" subtitle="Removes everything stored on this phone" onPress={eraseAll} last /></Card>

        <View style={{ alignItems: 'center', gap: 4, marginTop: space.xl }}>
          <T v="caption" color={c.textMuted}>{APP_NAME}</T>
          <Credit />
        </View>
      </Screen>

      <OptionSheet visible={hourOpen} onClose={() => setHourOpen(false)} title="Remind me at" value={settings.reminderHour} options={Array.from({ length: 16 }, (_, i) => ({ key: i + 6, label: hourLabel(i + 6) }))} onPick={async (h) => { await patch({ reminderHour: Number(h) }); refreshReminders(); }} />

      <Sheet visible={biz} onClose={() => setBiz(false)} title="Business details" tall footer={<Button block icon="checkmark" label="Save" onPress={async () => { await saveSettings({ ...settings, ...draft, businessName: draft.businessName.trim() || 'My Business', currency: draft.currency.trim() || 'Rs', countryCode: draft.countryCode.replace(/\D/g, '') || '92' }); setBiz(false); toast('Saved', 'success'); }} />}>
        <Field label="Business name" value={draft.businessName} onChangeText={(v) => setDraft((d) => ({ ...d, businessName: v }))} icon="business-outline" autoCapitalize="words" />
        <Field label="Your name" value={draft.ownerName} onChangeText={(v) => setDraft((d) => ({ ...d, ownerName: v }))} icon="person-outline" autoCapitalize="words" />
        <Field label="Business phone" value={draft.phone} onChangeText={(v) => setDraft((d) => ({ ...d, phone: v }))} icon="call-outline" keyboardType="phone-pad" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="Currency" value={draft.currency} onChangeText={(v) => setDraft((d) => ({ ...d, currency: v }))} placeholder="Rs" autoCapitalize="none" />
          <Field style={{ flex: 1 }} label="Country code" value={draft.countryCode} onChangeText={(v) => setDraft((d) => ({ ...d, countryCode: v }))} placeholder="92" keyboardType="number-pad" />
        </View>
      </Sheet>

      <Sheet visible={pinOpen} onClose={() => { setPinOpen(false); setPinErr(''); }} title="Set a PIN" footer={<Button block icon="lock-closed" label="Turn on PIN lock" onPress={savePin} />}>
        <Field label="PIN (4–6 digits)" value={pin} onChangeText={(v) => { setPinV(v.replace(/\D/g, '')); setPinErr(''); }} keyboardType="number-pad" secureTextEntry maxLength={6} icon="keypad-outline" autoFocus />
        <Field label="Repeat PIN" value={pin2} onChangeText={(v) => { setPin2(v.replace(/\D/g, '')); setPinErr(''); }} keyboardType="number-pad" secureTextEntry maxLength={6} icon="keypad-outline" error={pinErr || undefined} />
        <T v="caption" color={c.warning}>If you forget your PIN the only way back in is erasing app data, so keep a backup.</T>
      </Sheet>
    </View>
  );
}
