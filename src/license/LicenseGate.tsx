// Wrap the app: children render only with a valid license. useLicense() gives plan / features / days left.
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { Button, Card, Credit, Field, Pressy, Screen, T } from '../ui/kit';
import { Logo } from '../ui/Logo';
import { elevation, radius, space } from '../lib/theme';
import { getDeviceId } from './deviceId';
import { activateLicense, CheckResult, checkSavedLicense } from './licenseClient';
import type { Payload } from './licenseCore';
import { FeatureKey, featureOn } from './permissions';

export interface LicenseInfo { payload: Payload; daysLeft: number | null }
const Ctx = createContext<LicenseInfo | null>(null);
export const useLicense = () => useContext(Ctx);
export const useCan = () => { const i = useContext(Ctx); return (k: FeatureKey) => featureOn(i?.payload.features, k); };

const MESSAGES: Record<string, string> = {
  format: '', signature: 'This license key is not valid. Check that you copied the whole key.', project: 'This license belongs to a different app.',
  machine: 'This license was issued for a different device. Send us the Device ID shown above.', expired: 'This license has expired. Contact us to renew.',
  clock: 'The phone clock looks wrong. Set the correct date and time, then try again.',
  config: 'License verification is not configured in this build. Contact RetailX Solution.',
};

export default function LicenseGate({ children }: { children: ReactNode }) {
  const { toast } = useApp();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'loading' | 'ok' | 'locked'>('loading');
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = useCallback((r: CheckResult) => {
    if (r.ok) { setInfo({ payload: r.payload, daysLeft: r.daysLeft }); setState('ok'); setError(''); }
    else { setState('locked'); setInfo(null); setError(MESSAGES[r.reason] ?? ''); }
  }, []);
  const recheck = useCallback(async () => apply(await checkSavedLicense()), [apply]);

  useEffect(() => { getDeviceId().then(setDeviceId).catch(() => {}); recheck(); }, [recheck]);
  useEffect(() => { const sub = AppState.addEventListener('change', (s) => { if (s === 'active') recheck(); }); return () => sub.remove(); }, [recheck]);

  const activate = async () => {
    setBusy(true);
    try { const r = await activateLicense(input); apply(r); if (r.ok) toast('License activated', 'success'); else if (r.reason === 'format') setError('That does not look like a license key.'); }
    finally { setBusy(false); }
  };
  const paste = async () => { try { setInput((await Clipboard.getStringAsync()).trim()); } catch { /* ignore */ } };
  const copyId = async () => { try { await Clipboard.setStringAsync(deviceId); toast('Device ID copied', 'success'); } catch { /* ignore */ } };

  if (state === 'loading') return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.primary} /></View>;
  if (state === 'ok') return <Ctx.Provider value={info}>{children}</Ctx.Provider>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }} pad={false}>
      <LinearGradient colors={[c.gradientA, c.gradientB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + space.xxl, paddingBottom: 72, paddingHorizontal: space.xl, borderBottomLeftRadius: radius.xl + 8, borderBottomRightRadius: radius.xl + 8 }}>
        <Logo size={56} />
        <T v="display" color="#FFFFFF" style={{ marginTop: space.lg }}>Activate{'\n'}RetailX CRM</T>
        <T v="body" color="rgba(255,255,255,0.85)" style={{ marginTop: space.sm }}>Send your Device ID to RetailX Solution, then paste the license key you receive.</T>
      </LinearGradient>
      <View style={{ paddingHorizontal: space.lg, marginTop: -44 }}>
        <Card raised style={elevation.mid}>
          <T v="overline" color={c.textMuted}>Your Device ID</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm }}>
            <T v="heading" selectable style={{ flex: 1, fontVariant: ['tabular-nums'] }}>{deviceId || '…'}</T>
            <Pressy onPress={copyId} accessibilityLabel="Copy device ID" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="copy-outline" size={20} color={c.onPrimarySoft} /></Pressy>
          </View>
        </Card>
        <View style={{ marginTop: space.xl }}>
          <Field label="License key" value={input} onChangeText={(v) => { setInput(v); setError(''); }} placeholder="Paste your license key" multiline autoCapitalize="none" autoCorrect={false} icon="key-outline" error={error || undefined}
            right={<Pressy onPress={paste} accessibilityLabel="Paste from clipboard" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}><T v="label" color={c.primary}>Paste</T></Pressy>} />
          <Button block icon="shield-checkmark" label="Activate license" onPress={activate} loading={busy} disabled={!input.trim()} />
        </View>
        <Credit style={{ marginTop: space.xxl }} />
      </View>
    </Screen>
  );
}
