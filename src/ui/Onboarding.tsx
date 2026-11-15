import React, { useRef, useState } from 'react';
import { Animated, FlatList, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { Button, Chip, Field, IconName, Pressy, T } from './kit';
import { Logo } from './Logo';
import { elevation, radius, space } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { DEFAULT_SETTINGS } from '../db/types';

interface Page { key: string; icon: IconName; title: string; text: string; orbit: IconName[] }
const PAGES: Page[] = [
  { key: 'people', icon: 'people', title: 'Every customer,\none clear profile', text: 'Contacts, history, notes, files and tags together. Search finds anyone in a keystroke.', orbit: ['call', 'logo-whatsapp', 'mail', 'attach'] },
  { key: 'pipeline', icon: 'trending-up', title: 'Close more deals,\nmiss none', text: 'Track leads through a visual pipeline, forecast revenue and never lose a follow-up.', orbit: ['flag', 'cash', 'stats-chart', 'time'] },
  { key: 'offline', icon: 'shield-checkmark', title: 'Fully offline.\nYours alone.', text: 'No account, no cloud. Your data stays on this phone, protected by PIN or biometrics, with encrypted backups.', orbit: ['lock-closed', 'finger-print', 'cloud-offline', 'save'] },
];

function Illustration({ page }: { page: Page }) {
  const { c } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;
  React.useEffect(() => { Animated.loop(Animated.timing(spin, { toValue: 1, duration: 24000, useNativeDriver: true })).start(); return () => spin.stopAnimation(); }, [spin]);
  const R = 104;
  return (
    <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: c.primarySoft, opacity: 0.5 }} />
      <View style={{ position: 'absolute', width: 208, height: 208, borderRadius: 104, borderWidth: 1.5, borderColor: c.borderStrong, borderStyle: 'dashed' }} />
      <Animated.View style={{ position: 'absolute', width: 208, height: 208, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        {page.orbit.map((ic, i) => {
          const a = (i / page.orbit.length) * Math.PI * 2 - Math.PI / 4;
          return (
            <Animated.View key={ic} style={{ position: 'absolute', left: 104 + Math.cos(a) * R - 22, top: 104 + Math.sin(a) * R - 22, width: 44, height: 44, borderRadius: 15, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', ...elevation.mid, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }}>
              <Ionicons name={ic} size={21} color={i % 2 ? c.secondary : c.accent} />
            </Animated.View>
          );
        })}
      </Animated.View>
      <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', ...elevation.high }}>
        <Ionicons name={page.icon} size={46} color={c.onPrimary} />
      </View>
    </View>
  );
}

export function Onboarding() {
  const W = useWindowDimensions().width;
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, saveSettings, toast } = useApp();
  const [idx, setIdx] = useState(0);
  const [biz, setBiz] = useState('');
  const [owner, setOwner] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_SETTINGS.currency);
  const list = useRef<FlatList>(null);
  const x = useRef(new Animated.Value(0)).current;
  const total = PAGES.length + 1;
  const last = idx === total - 1;

  const go = (i: number) => { haptic.tap(); list.current?.scrollToIndex({ index: i, animated: true }); };
  const finish = async () => {
    if (!biz.trim()) { toast('Enter your business name to continue', 'error'); return; }
    await saveSettings({ ...settings, businessName: biz.trim(), ownerName: owner.trim(), currency, onboarded: true });
    haptic.success();
  };

  const data: (Page | { key: 'setup' })[] = [...PAGES, { key: 'setup' }];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, minHeight: 52 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Logo size={30} /><T v="heading">RetailX CRM</T></View>
        {!last ? <Pressy onPress={() => go(total - 1)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }} accessibilityLabel="Skip introduction"><T v="label" color={c.textMuted}>Skip</T></Pressy> : null}
      </View>
      <Animated.FlatList
        ref={list as any} data={data} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(p) => p.key} keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })} scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / W); if (i !== idx) { setIdx(i); haptic.tap(); } }}
        renderItem={({ item }) => item.key === 'setup' ? (
          <View style={{ width: W, paddingHorizontal: space.xl, justifyContent: 'center' }}>
            <T v="display">Set up your{'\n'}workspace</T>
            <T v="body" color={c.textMuted} style={{ marginTop: space.sm, marginBottom: space.xxl }}>This appears on your reports and exports. You can change it any time in Settings.</T>
            <Field label="Business name" value={biz} onChangeText={setBiz} placeholder="e.g. Al-Noor Traders" icon="storefront-outline" returnKeyType="next" />
            <Field label="Your name (optional)" value={owner} onChangeText={setOwner} placeholder="e.g. Ali Raza" icon="person-outline" />
            <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Currency symbol</T>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {['Rs', '$', '€', '£', 'AED', 'SAR'].map((s) => <Chip key={s} label={s} selected={currency === s} onPress={() => setCurrency(s)} />)}
            </View>
          </View>
        ) : (
          <View style={{ width: W, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' }}>
            <Illustration page={item as Page} />
            <T v="display" align="center" style={{ marginTop: space.xxl }}>{(item as Page).title}</T>
            <T v="body" color={c.textMuted} align="center" style={{ marginTop: space.md, maxWidth: 320 }}>{(item as Page).text}</T>
          </View>
        )}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
      />
      <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }} accessibilityLabel={`Step ${idx + 1} of ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <Animated.View key={i} style={{ height: 8, borderRadius: 4, backgroundColor: c.primary, width: x.interpolate({ inputRange: [(i - 1) * W, i * W, (i + 1) * W], outputRange: [8, 26, 8], extrapolate: 'clamp' }), opacity: x.interpolate({ inputRange: [(i - 1) * W, i * W, (i + 1) * W], outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }) }} />
          ))}
        </View>
        <Button block label={last ? 'Start using RetailX CRM' : 'Continue'} icon={last ? 'rocket' : 'arrow-forward'} onPress={last ? finish : () => go(idx + 1)} />
      </View>
    </View>
  );
}
