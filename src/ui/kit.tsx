// RetailX CRM design system — every visual primitive lives here (or in Sheet.tsx / charts.tsx).
// Screens compose these; they never use raw colours, sizes or fonts.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, PanResponder, Pressable, ScrollView, StyleProp, StyleSheet, Text,
  TextInput, TextInputProps, TextStyle, View, ViewStyle, RefreshControlProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../ctx/ThemeContext';
import { avatarColor, elevation, fontFamily, iconSize, MAX_CONTENT, MIN_TOUCH, radius, space, type, TypeKey } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { Fmt } from '../lib/format';
import { CREDIT } from '../lib/brand';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Cards with pad={0} (list cards) set this so their <Row>s add their own horizontal padding. */
const RowInsetContext = React.createContext(false);

// ───────────────────────── Text ─────────────────────────
export function T({ v = 'body', color, children, style, align, numberOfLines, ...rest }: {
  v?: TypeKey; color?: string; children?: React.ReactNode; style?: StyleProp<TextStyle>; align?: TextStyle['textAlign']; numberOfLines?: number; selectable?: boolean; accessibilityRole?: 'header' | 'text'; maxFontSizeMultiplier?: number;
}) {
  const { c } = useTheme();
  const s = type[v];
  return (
    <Text numberOfLines={numberOfLines} maxFontSizeMultiplier={1.3} {...rest}
      style={[{ fontFamily: fontFamily[s.family], fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.tracking, color: color ?? c.text, textAlign: align }, v === 'overline' && { textTransform: 'uppercase' }, style]}>
      {children}
    </Text>
  );
}

// ───────────────────────── Pressable with spring feedback ─────────────────────────
// One animated Pressable carries the WHOLE style (size, padding, background, border), so nothing is lost.
const APressable = Animated.createAnimatedComponent(Pressable);
export function Pressy({ children, onPress, onLongPress, style, disabled, scale = 0.97, haptics = 'tap', hitSlop, accessibilityLabel, accessibilityRole = 'button', accessibilityState, testID }: {
  children: React.ReactNode; onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; scale?: number;
  haptics?: 'tap' | 'light' | 'medium' | 'none'; hitSlop?: number; accessibilityLabel?: string; accessibilityRole?: 'button' | 'link' | 'tab' | 'checkbox' | 'switch' | 'radio'; accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean }; testID?: string;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, speed: 40, bounciness: 4, useNativeDriver: true }).start();
  return (
    <APressable
      testID={testID} disabled={disabled} hitSlop={hitSlop}
      accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled, ...accessibilityState }}
      onPressIn={() => to(scale)} onPressOut={() => to(1)}
      onPress={() => { if (haptics !== 'none') haptic[haptics](); onPress?.(); }}
      onLongPress={onLongPress ? () => { haptic.medium(); onLongPress(); } : undefined}
      style={[style, { transform: [{ scale: s }], opacity: disabled ? 0.5 : 1 }] as any}>
      {children}
    </APressable>
  );
}

// ───────────────────────── Surfaces ─────────────────────────
export function Card({ children, style, onPress, onLongPress, pad = 'lg', raised = false }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; onLongPress?: () => void; pad?: keyof typeof space | 0; raised?: boolean;
}) {
  const { c, isDark } = useTheme();
  const base: ViewStyle = {
    backgroundColor: raised ? c.surfaceRaised : c.surface, borderRadius: radius.lg, padding: pad === 0 ? 0 : space[pad],
    borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.border, ...(isDark ? {} : elevation.low),
  };
  const inset = pad === 0;
  const body = inset ? <RowInsetContext.Provider value>{children}</RowInsetContext.Provider> : children;
  if (onPress || onLongPress) return <Pressy onPress={onPress} onLongPress={onLongPress} scale={0.985} style={[base, style]}>{body}</Pressy>;
  return <View style={[base, style]}>{body}</View>;
}

/** Gradient hero surface — used sparingly (dashboard summary, profile header, onboarding). */
export function Hero({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <LinearGradient colors={[c.gradientA, c.gradientB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius.xl, padding: space.xl, overflow: 'hidden' }, elevation.mid, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.09)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: 30, bottom: -60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />
      {children}
    </LinearGradient>
  );
}

// ───────────────────────── Screen scaffold ─────────────────────────
export function Screen({ children, scroll = true, pad = true, bottomInset = true, refreshControl, contentStyle, keyboard = true, stickyFooter }: {
  children: React.ReactNode; scroll?: boolean; pad?: boolean; bottomInset?: boolean; refreshControl?: React.ReactElement<RefreshControlProps>; contentStyle?: StyleProp<ViewStyle>; keyboard?: boolean; stickyFooter?: React.ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const inner: ViewStyle = { paddingHorizontal: pad ? space.lg : 0, paddingBottom: bottomInset ? insets.bottom + space.lg : 0 };
  const col: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' };
  const body = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} refreshControl={refreshControl} contentContainerStyle={[inner, contentStyle]}><View style={col}>{children}</View></ScrollView>
    : <View style={[{ flex: 1 }, inner, contentStyle]}><View style={[col, { flex: 1 }]}>{children}</View></View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior="padding" enabled={keyboard}>
      <View style={{ flex: 1 }}>{body}</View>
      {stickyFooter}
    </KeyboardAvoidingView>
  );
}

/** Large-title header with optional back button and trailing actions. Sits inside the safe area. */
export function Header({ title, subtitle, back, right, large = true, modal }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; large?: boolean; modal?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: c.bg }}>
      <View style={{ width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH, gap: space.sm }}>
         {back ? <IconButton icon={modal ? 'close' : 'chevron-back'} label={modal ? 'Close' : 'Back'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ marginLeft: -space.sm }} /> : null}
        <View style={{ flex: 1 }}>
          {!large ? <T v="heading" numberOfLines={1} accessibilityRole="header">{title}</T> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: space.xs }}>{right}</View>
      </View>
      {large ? (
        <View style={{ marginTop: 2 }}>
          <T v="display" numberOfLines={2} accessibilityRole="header">{title}</T>
          {subtitle ? <T v="body" color={c.textMuted} style={{ marginTop: 2 }}>{subtitle}</T> : null}
        </View>
      ) : subtitle ? <T v="caption" color={c.textMuted}>{subtitle}</T> : null}
      </View>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md }}>
      <T v="heading" accessibilityRole="header">{title}</T>
      {action ? <Pressy onPress={onAction} haptics="tap" hitSlop={10} style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}><T v="label" color={c.primary}>{action}</T></Pressy> : null}
    </View>
  );
}

// ───────────────────────── Buttons ─────────────────────────
type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline';
export function Button({ label, onPress, icon, variant = 'primary', size = 'md', block, loading, disabled, style }: {
  label: string; onPress?: () => void; icon?: IconName; variant?: BtnVariant; size?: 'sm' | 'md'; block?: boolean; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const map: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary }, soft: { bg: c.primarySoft, fg: c.onPrimarySoft }, ghost: { bg: 'transparent', fg: c.primary },
    danger: { bg: c.dangerSoft, fg: c.onDangerSoft }, outline: { bg: 'transparent', fg: c.text, border: c.borderStrong },
  };
  const m = map[variant];
  const h = size === 'sm' ? MIN_TOUCH : 52; const padV = size === 'sm' ? space.sm : space.md;
  return (
    <Pressy onPress={onPress} disabled={disabled || loading} haptics="light" accessibilityLabel={label}
      style={[{ minHeight: h, borderRadius: radius.md, paddingHorizontal: size === 'sm' ? space.lg : space.xl, paddingVertical: padV, backgroundColor: m.bg, borderWidth: m.border ? 1 : 0, borderColor: m.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm, alignSelf: block ? 'stretch' : 'flex-start' }, block && { flexGrow: 1, flexShrink: 1 }, style]}>
      {loading ? <ActivityIndicator color={m.fg} /> : icon ? <Ionicons name={icon} size={iconSize.md} color={m.fg} /> : null}
      <T v="bodyStrong" color={m.fg} align="center" style={{ flexShrink: 1 }}>{label}</T>
    </Pressy>
  );
}

export function IconButton({ icon, onPress, label, tone = 'plain', style, size = iconSize.lg, badge }: { icon: IconName; onPress?: () => void; label: string; tone?: 'plain' | 'soft' | 'primary'; style?: StyleProp<ViewStyle>; size?: number; badge?: number }) {
  const { c } = useTheme();
  const bg = tone === 'soft' ? c.surfaceAlt : tone === 'primary' ? c.primary : 'transparent';
  const fg = tone === 'primary' ? c.onPrimary : c.text;
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} style={[{ width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={icon} size={size} color={fg} />
      {badge ? <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 10, fontFamily: fontFamily.bold }}>{badge > 9 ? '9+' : badge}</Text></View> : null}
    </Pressy>
  );
}

/** Compact − / value / + control (replaces two loose text buttons that cramped list rows). */
export function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: radius.pill }}>
      <IconButton icon="remove" label={`Decrease ${label}`} size={iconSize.md} onPress={() => onChange(Math.max(min, value - 1))} />
      <T v="bodyStrong" align="center" style={{ minWidth: 28, fontVariant: ['tabular-nums'] }}>{value}</T>
      <IconButton icon="add" label={`Increase ${label}`} size={iconSize.md} onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

export function Fab({ icon = 'add', label, onPress, bottom = 0 }: { icon?: IconName; label: string; onPress: () => void; bottom?: number }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: space.lg, bottom: bottom + space.lg + (bottom ? 0 : insets.bottom) }}>
      <Pressy onPress={onPress} haptics="medium" accessibilityLabel={label} style={[{ height: 58, minWidth: 58, borderRadius: 29, paddingHorizontal: space.lg, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, elevation.high]}>
        <Ionicons name={icon} size={26} color={c.onPrimary} />
      </Pressy>
    </View>
  );
}

// ───────────────────────── Chips, badges, avatars ─────────────────────────
export function Chip({ label, selected, onPress, icon, color, count }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; color?: string; count?: number }) {
  const { c } = useTheme();
  const bg = selected ? c.primary : c.surface; const fg = selected ? c.onPrimary : c.textMuted;
  return (
    <Pressy onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: !!selected }} accessibilityLabel={label}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: bg, borderWidth: 1, borderColor: selected ? c.primary : c.border, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      {icon ? <Ionicons name={icon} size={iconSize.sm} color={fg} /> : null}
      <T v="label" color={fg}>{label}</T>
      {count != null ? <T v="caption" color={selected ? c.onPrimary : c.textFaint}>{count}</T> : null}
    </Pressy>
  );
}

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'secondary';
export function useTone(tone: Tone) {
  const { c } = useTheme();
  return {
    primary: { bg: c.primarySoft, fg: c.onPrimarySoft }, success: { bg: c.successSoft, fg: c.onSuccessSoft }, warning: { bg: c.warningSoft, fg: c.onWarningSoft },
    danger: { bg: c.dangerSoft, fg: c.onDangerSoft }, neutral: { bg: c.surfaceAlt, fg: c.textMuted }, accent: { bg: c.accentSoft, fg: c.accent }, secondary: { bg: c.secondarySoft, fg: c.secondary },
  }[tone];
}
export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = useTone(tone);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: t.bg, alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <T v="caption" color={t.fg} style={{ fontFamily: fontFamily.semibold }}>{label}</T>
    </View>
  );
}

export function Avatar({ name, size = 44, color }: { name: string; size?: number; color?: string }) {
  const bg = color ?? avatarColor(name || '?');
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: bg + '26', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: size * 0.38, color: bg }} allowFontScaling={false}>{Fmt.initials(name)}</Text>
    </View>
  );
}

export function IconTile({ icon, color, size = 40 }: { icon: IconName; color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: color + '24', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={size * 0.5} color={color} /></View>;
}

// ───────────────────────── Inputs ─────────────────────────
export function Field({ label, error, icon, right, style, inputStyle, multiline, ...p }: TextInputProps & { label?: string; error?: string; icon?: IconName; right?: React.ReactNode; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      {label ? <T v="label" color={c.textMuted} style={{ marginBottom: 6 }}>{label}</T> : null}
      <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', minHeight: 52, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: focus ? 2 : 1, borderColor: error ? c.danger : focus ? c.primary : c.border, paddingHorizontal: space.md - (focus ? 1 : 0), gap: space.sm }}>
        {icon ? <Ionicons name={icon} size={iconSize.md} color={focus ? c.primary : c.textFaint} style={multiline ? { marginTop: 14 } : undefined} /> : null}
        <TextInput
          {...p} multiline={multiline} accessibilityLabel={label ?? p.placeholder} placeholderTextColor={c.textFaint} selectionColor={c.primary}
          onFocus={(e) => { setFocus(true); p.onFocus?.(e); }} onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
          style={[{ flex: 1, fontFamily: fontFamily.regular, fontSize: 16, color: c.text, paddingVertical: multiline ? 14 : 12, minHeight: multiline ? 96 : undefined, textAlignVertical: multiline ? 'top' : 'center' }, inputStyle]} />
        {right}
      </View>
      {error ? <T v="caption" color={c.danger} style={{ marginTop: 4 }}>{error}</T> : null}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Search', onFilter, filterActive }: { value: string; onChangeText: (v: string) => void; placeholder?: string; onFilter?: () => void; filterActive?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: space.md, gap: space.sm }}>
        <Ionicons name="search" size={iconSize.md} color={c.textFaint} />
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.textFaint} accessibilityLabel={placeholder} returnKeyType="search" selectionColor={c.primary}
          style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: 16, color: c.text, paddingVertical: 0 }} />
        {value ? <Pressy onPress={() => onChangeText('')} accessibilityLabel="Clear search" hitSlop={10}><Ionicons name="close-circle" size={20} color={c.textFaint} /></Pressy> : null}
      </View>
      {onFilter ? (
        <Pressy onPress={onFilter} accessibilityLabel="Filters" style={{ width: 50, height: 50, borderRadius: radius.lg, backgroundColor: filterActive ? c.primary : c.surface, borderWidth: 1, borderColor: filterActive ? c.primary : c.border, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="options" size={iconSize.md} color={filterActive ? c.onPrimary : c.text} />
        </Pressy>
      ) : null}
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const seg = w / options.length;
  useEffect(() => { Animated.spring(x, { toValue: idx * seg, speed: 22, bounciness: 3, useNativeDriver: true }).start(); }, [idx, seg, x]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 4 }} accessibilityRole="tablist">
      {w > 0 ? <Animated.View style={{ position: 'absolute', top: 4, left: 4, width: seg, bottom: 4, borderRadius: radius.md - 4, backgroundColor: c.surface, ...elevation.low, transform: [{ translateX: x }] }} /> : null}
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => { if (o.key !== value) { haptic.tap(); onChange(o.key); } }} accessibilityRole="tab" accessibilityState={{ selected: o.key === value }} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
          <T v="label" color={o.key === value ? c.text : c.textMuted} style={o.key === value ? { fontFamily: fontFamily.semibold } : undefined}>{o.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.spring(x, { toValue: value ? 1 : 0, speed: 24, bounciness: 4, useNativeDriver: true }).start(); }, [value, x]);
  return (
    <Pressable onPress={() => { haptic.tap(); onChange(!value); }} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} hitSlop={8}
      style={{ width: 52, height: 32, borderRadius: 16, backgroundColor: value ? c.primary : c.borderStrong, padding: 3, justifyContent: 'center' }}>
      <Animated.View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }], ...elevation.low }} />
    </Pressable>
  );
}

/** Labelled switch row: title (+ optional hint) on the left, Toggle on the right. */
export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: MIN_TOUCH }}>
      <View style={{ flex: 1 }}><T v="bodyStrong">{label}</T>{hint ? <T v="caption" color={c.textMuted}>{hint}</T> : null}</View>
      <Toggle value={value} onChange={onChange} label={label} />
    </View>
  );
}

// ───────────────────────── Lists ─────────────────────────
export function Row({ icon, iconColor, title, subtitle, right, onPress, onLongPress, chevron, danger, last, leading }: {
  icon?: IconName; iconColor?: string; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; onLongPress?: () => void; chevron?: boolean; danger?: boolean; last?: boolean; leading?: React.ReactNode;
}) {
  const { c } = useTheme();
  const inset = React.useContext(RowInsetContext);
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingVertical: space.sm, paddingHorizontal: inset ? space.lg : 0 }}>
      {leading ?? (icon ? <IconTile icon={icon} color={danger ? c.danger : iconColor ?? c.primary} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="bodyStrong" color={danger ? c.danger : c.text} numberOfLines={2}>{title}</T>
        {subtitle ? <T v="caption" color={c.textMuted} numberOfLines={2} style={{ marginTop: 1 }}>{subtitle}</T> : null}
      </View>
      {right ? <View style={{ justifyContent: 'center', flexShrink: 0 }}>{right}</View> : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={c.textFaint} /> : null}
    </View>
  );
  return (
    <View style={!last ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border } : undefined}>
      {onPress || onLongPress ? <Pressy onPress={onPress} onLongPress={onLongPress} scale={0.99} haptics="tap" accessibilityLabel={title}>{content}</Pressy> : content}
    </View>
  );
}

/** Swipe right → onRight (e.g. done), swipe left → onLeft (e.g. snooze). Releases past the threshold fire with haptics. */
export function SwipeRow({ children, onRight, onLeft, rightLabel = 'Done', leftLabel = 'Snooze', rightIcon = 'checkmark', leftIcon = 'time', rightTone = 'success', leftTone = 'warning' }: {
  children: React.ReactNode; onRight?: () => void; onLeft?: () => void; rightLabel?: string; leftLabel?: string; rightIcon?: IconName; leftIcon?: IconName; rightTone?: 'success' | 'warning' | 'danger'; leftTone?: 'success' | 'warning' | 'danger';
}) {
  const { c } = useTheme();
  const x = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);
  const cb = useRef({ onRight, onLeft }); cb.current = { onRight, onLeft };
  const TH = 88;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_, g) => {
      const dx = (g.dx > 0 && !cb.current.onRight) || (g.dx < 0 && !cb.current.onLeft) ? g.dx * 0.15 : g.dx;
      x.setValue(Math.max(-140, Math.min(140, dx)));
      const now = Math.abs(dx) > TH; if (now && !armed.current) haptic.light(); armed.current = now;
    },
    onPanResponderRelease: (_, g) => {
      const fire = Math.abs(g.dx) > TH; const right = g.dx > 0;
      Animated.spring(x, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: true }).start();
      armed.current = false;
      if (fire) { haptic.medium(); (right ? cb.current.onRight : cb.current.onLeft)?.(); }
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const tone = { success: [c.success, '#FFFFFF'], warning: [c.warning, '#FFFFFF'], danger: [c.danger, '#FFFFFF'] } as const;
  return (
    <View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg, backgroundColor: tone[rightTone][0], justifyContent: 'center', paddingLeft: space.xl, opacity: x.interpolate({ inputRange: [0, 30], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={rightIcon} size={22} color="#fff" /><T v="label" color="#fff">{rightLabel}</T></View>
        </Animated.View>
        <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg, backgroundColor: tone[leftTone][0], justifyContent: 'center', alignItems: 'flex-end', paddingRight: space.xl, opacity: x.interpolate({ inputRange: [-30, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T v="label" color="#fff">{leftLabel}</T><Ionicons name={leftIcon} size={22} color="#fff" /></View>
        </Animated.View>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}

// ───────────────────────── Feedback states ─────────────────────────
export function EmptyState({ icon, title, message, action, onAction }: { icon: IconName; title: string; message: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(f, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(f, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])).start(); return () => f.stopAnimation(); }, [f]);
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.huge, paddingHorizontal: space.xl }}>
      <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: c.primarySoft, opacity: 0.55 }} />
        <View style={{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: c.primarySoft }} />
        <Animated.View style={{ transform: [{ translateY: f.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) }] }}>
          <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', ...elevation.mid }}><Ionicons name={icon} size={30} color={c.primary} /></View>
        </Animated.View>
        <View style={{ position: 'absolute', top: 14, right: 18, width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} />
        <View style={{ position: 'absolute', bottom: 18, left: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: c.secondary }} />
      </View>
      <T v="heading" align="center" style={{ marginTop: space.lg }}>{title}</T>
      <T v="body" color={c.textMuted} align="center" style={{ marginTop: 6, maxWidth: 300 }}>{message}</T>
      {action ? <Button label={action} onPress={onAction} variant="soft" style={{ marginTop: space.xl }} /> : null}
    </View>
  );
}

export function Skeleton({ w, h = 16, r = 8, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(p, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(p, { toValue: 0, duration: 800, useNativeDriver: true })])).start(); return () => p.stopAnimation(); }, [p]);
  return <Animated.View accessible={false} style={[{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: c.skeleton, opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }, style]} />;
}
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View accessibilityLabel="Loading" style={{ gap: space.md }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Skeleton w={44} h={44} r={16} />
          <View style={{ flex: 1, gap: 8 }}><Skeleton w="55%" h={14} /><Skeleton w="35%" h={11} /></View>
        </Card>
      ))}
    </View>
  );
}

/** Counts up to `value` whenever it changes. */
export function AnimatedNumber({ value, format = (n: number) => String(Math.round(n)), style, v = 'title', color, duration = 800 }: { value: number; format?: (n: number) => string; style?: StyleProp<TextStyle>; v?: TypeKey; color?: string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const a = new Animated.Value(0);
    const id = a.addListener(({ value: p }) => setShown(from.current + (value - from.current) * p));
    Animated.timing(a, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => { if (finished) { from.current = value; setShown(value); } });
    return () => { a.removeListener(id); from.current = value; };
  }, [value, duration]);
  return <T v={v} color={color} style={[{ fontVariant: ['tabular-nums'] }, style]}>{format(shown)}</T>;
}

export function Progress({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const { c } = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(w, { toValue: Math.max(0, Math.min(100, value)), duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [value, w]);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}>
      <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: c[tone], width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function Credit({ style }: { style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <T v="caption" color={c.textFaint} align="center" style={style}>{CREDIT}</T>;
}

/** Fade + rise entrance; stagger with `index`. Cheap (native driver). */
export function FadeIn({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 380, delay: Math.min(index, 8) * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [a, index]);
  return <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>{children}</Animated.View>;
}
