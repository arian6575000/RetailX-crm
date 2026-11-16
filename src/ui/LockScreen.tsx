import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../ctx/AppContext';
import { Credit, Pressy, T } from './kit';
import { Logo } from './Logo';
import { biometricEnabled, biometricUnlock, checkPin, lockState, removePin } from '../lib/lock';
import { Repo } from '../db/repo';
import { cleanOrphanFiles } from '../lib/files';
import { haptic } from '../lib/haptics';
import { fontFamily, radius, space } from '../lib/theme';

// The lock screen is always dark-on-gradient (like a banking app) so it reads the same in both themes.
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'back'];

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { confirm, reloadSettings, bump } = useApp();
  const [pin, setPin] = useState('');
  const [fails, setFails] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);
  const [wait, setWait] = useState(0);
  const shake = useRef(new Animated.Value(0)).current;

  const tryBio = useCallback(async () => { if (await biometricUnlock('Unlock RetailX CRM')) { haptic.success(); onUnlock(); } }, [onUnlock]);
  useEffect(() => {
    (async () => {
      const ls = await lockState(); setFails(ls.count); setWait(ls.waitSec);
      if (await biometricEnabled()) { setBio(true); if (!ls.waitSec) tryBio(); }
    })();
  }, [tryBio]);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(id);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const wrong = () => {
    haptic.error();
    Animated.sequence([-10, 10, -8, 8, -4, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true }))).start();
  };

  const press = async (k: string) => {
    if (busy || wait > 0) return;
    if (k === 'bio') { if (bio) tryBio(); return; }
    haptic.tap();
    const next = k === 'back' ? pin.slice(0, -1) : pin.length < 4 ? pin + k : pin;
    setPin(next); setMsg('');
    if (next.length === 4) {
      setBusy(true);
      const r = await checkPin(next);
      if (r.ok) { haptic.success(); onUnlock(); return; }
      setFails(r.count); setWait(r.waitSec); setPin(''); wrong();
      setMsg(r.waitSec ? `Too many attempts. Try again in ${r.waitSec}s.` : 'Incorrect PIN. Try again.');
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!(await confirm('This erases ALL customers, leads and attachments on this phone and removes the PIN. Restore from a backup afterwards if you have one.', { title: 'Forgot your PIN?', danger: true, okLabel: 'Erase everything' }))) return;
    await Repo.eraseAll(); await removePin(); await cleanOrphanFiles(); await reloadSettings(); bump(); onUnlock();
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} accessibilityViewIsModal>
      <LinearGradient colors={['#14183A', '#2A1F6B', '#4338CA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.xl }}>
        <View style={{ alignItems: 'center', marginTop: space.xl }}>
          <Logo size={64} />
          <T v="title" color="#FFFFFF" style={{ marginTop: space.lg }}>Welcome back</T>
          <T v="body" color="rgba(255,255,255,0.78)" style={{ marginTop: 4 }}>Enter your PIN to unlock</T>
          <Animated.View style={{ flexDirection: 'row', gap: 18, marginTop: space.xxl, transform: [{ translateX: shake }] }} accessibilityLabel={`${pin.length} of 4 digits entered`}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: i < pin.length ? '#FFFFFF' : 'transparent' }} />)}
          </Animated.View>
          <T v="label" color="#FFB3AF" align="center" style={{ minHeight: 40, marginTop: space.lg, paddingHorizontal: space.xl }} accessibilityRole="text">{wait > 0 ? `Too many attempts. Try again in ${wait}s.` : msg}</T>
        </View>
        <View style={{ width: '100%', maxWidth: 300, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
          {KEYS.map((k) => (
            <Pressable key={k} onPress={() => press(k)} accessibilityRole="button" accessibilityLabel={k === 'back' ? 'Delete' : k === 'bio' ? 'Use biometrics' : k} disabled={k === 'bio' && !bio}
              style={({ pressed }) => ({ width: 84, height: 70, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: k === 'bio' && !bio ? 'transparent' : pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)' })}>
              {k === 'back' ? <Ionicons name="backspace-outline" size={26} color="#fff" /> : k === 'bio' ? (bio ? <Ionicons name="finger-print" size={30} color="#fff" /> : null) : <T v="display" color="#FFFFFF" style={{ fontFamily: fontFamily.medium, fontSize: 28 }}>{k}</T>}
            </Pressable>
          ))}
        </View>
        <View style={{ alignItems: 'center', gap: space.md }}>
          {fails >= 5 ? <Pressy onPress={forgot} style={{ minHeight: 44, justifyContent: 'center' }}><T v="label" color="#FFB3AF">Forgot PIN?</T></Pressy> : null}
          <Credit style={{ color: 'rgba(255,255,255,0.6)' }} />
        </View>
      </SafeAreaView>
    </View>
  );
}
