import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Repo } from '../db/repo';
import { DEFAULT_SETTINGS, Settings } from '../db/types';
import { Fmt } from '../lib/format';
import { fontFamily, radius } from '../lib/theme';
import { setHapticsEnabled, haptic } from '../lib/haptics';
import { syncReminders } from '../lib/notify';
import { cleanOrphanFiles } from '../lib/files';
import { ThemeProvider, useTheme } from './ThemeContext';

type ToastType = 'default' | 'success' | 'error';
interface Ctx {
  settings: Settings;
  /** Bumps whenever data changed anywhere; screens depend on it (see useData). */
  version: number;
  bump: () => void;
  saveSettings: (s: Settings) => Promise<void>;
  reloadSettings: () => Promise<void>;
  toast: (msg: string, type?: ToastType) => void;
  confirm: (message: string, opts?: { title?: string; danger?: boolean; okLabel?: string }) => Promise<boolean>;
  refreshReminders: () => void;
}
const AppCtx = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  Fmt.currency = settings.currency || 'Rs';

  const reloadSettings = useCallback(async () => {
    const s = await Repo.getSettings();
    setSettings(s); setHapticsEnabled(s.haptics); setLoaded(true);
  }, []);
  useEffect(() => { reloadSettings(); cleanOrphanFiles(); }, [reloadSettings]);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const refreshReminders = useCallback(() => { syncReminders(); }, []);
  useEffect(() => { if (loaded) syncReminders(); }, [loaded, version]);

  const saveSettings = useCallback(async (s: Settings) => {
    await Repo.saveSettings(s); setSettings(s); setHapticsEnabled(s.haptics);
  }, []);

  const [toastState, setToastState] = useState<{ msg: string; type: ToastType } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((msg: string, type: ToastType = 'default') => {
    if (timer.current) clearTimeout(timer.current);
    setToastState({ msg, type });
    if (type === 'success') haptic.success(); else if (type === 'error') haptic.error();
    Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastState(null));
    }, 2400);
  }, [anim]);

  const confirm = useCallback((message: string, opts: { title?: string; danger?: boolean; okLabel?: string } = {}) =>
    new Promise<boolean>((resolve) => {
      Alert.alert(opts.title || 'Are you sure?', message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: opts.okLabel || 'Confirm', style: opts.danger ? 'destructive' : 'default', onPress: () => resolve(true) },
      ], { cancelable: true, onDismiss: () => resolve(false) });
    }), []);

  const value = useMemo<Ctx>(() => ({ settings, version, bump, saveSettings, reloadSettings, toast, confirm, refreshReminders }),
    [settings, version, bump, saveSettings, reloadSettings, toast, confirm, refreshReminders]);

  return (
    <AppCtx.Provider value={value}>
      <ThemeProvider mode={settings.theme}>
        {children}
        <Toast state={toastState} anim={anim} />
      </ThemeProvider>
    </AppCtx.Provider>
  );
}

function Toast({ state, anim }: { state: { msg: string; type: ToastType } | null; anim: Animated.Value }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!state) return null;
  const bg = state.type === 'error' ? c.danger : state.type === 'success' ? c.success : c.text;
  const fg = state.type === 'default' ? c.bg : '#FFFFFF';
  const icon = state.type === 'error' ? 'alert-circle' : state.type === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <Animated.View
      pointerEvents="none" accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      <View style={[styles.toast, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={fg} />
        <Text style={[styles.text, { color: fg }]}>{state.msg}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 999 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.pill, maxWidth: '100%', ...Platform.select({ android: { elevation: 8 }, default: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } } }) },
  text: { fontFamily: fontFamily.medium, fontSize: 14, flexShrink: 1 },
});
