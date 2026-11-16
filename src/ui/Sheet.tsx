// Bottom sheet (drag-to-dismiss, keyboard aware) + contextual action menu.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ctx/ThemeContext';
import { elevation, radius, space } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { IconName, Pressy, T } from './kit';

export function Sheet({ visible, onClose, title, children, footer, tall }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode; tall?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const H = useWindowDimensions().height;
  const y = useRef(new Animated.Value(H)).current;
  const [mounted, setMounted] = useState(visible);
  const close = useRef(onClose); close.current = onClose;

  useEffect(() => {
    if (visible) { setMounted(true); y.setValue(H); Animated.timing(y, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }
    else if (mounted) Animated.timing(y, { toValue: H, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 110 || g.vy > 0.9) close.current();
      else Animated.spring(y, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }).start();
    },
  })).current;

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay, opacity: y.interpolate({ inputRange: [0, H], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <Animated.View accessibilityViewIsModal style={[{ width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: tall ? H * 0.94 : H * 0.88, backgroundColor: c.surfaceRaised, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, transform: [{ translateY: y }] }, elevation.high]}>
          <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderStrong }} />
            {title ? <T v="heading" style={{ marginTop: space.md }} accessibilityRole="header">{title}</T> : null}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: footer ? space.md : insets.bottom + space.lg }}>{children}</ScrollView>
          {footer ? <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: insets.bottom + space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface MenuAction { label: string; icon: IconName; onPress: () => void; danger?: boolean; hint?: string }

/** Contextual action menu: long-press a row, or tap "more", to get this sheet. */
export function ActionMenu({ visible, onClose, title, subtitle, actions }: { visible: boolean; onClose: () => void; title?: string; subtitle?: string; actions: MenuAction[] }) {
  const { c } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {subtitle ? <T v="caption" color={c.textMuted} align="center" style={{ marginTop: -space.sm, marginBottom: space.md }}>{subtitle}</T> : null}
      {actions.map((a, i) => (
        <Pressy key={a.label} haptics={a.danger ? 'medium' : 'tap'} scale={0.99} accessibilityLabel={a.label}
          onPress={() => { onClose(); setTimeout(a.onPress, 240); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.border }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: a.danger ? c.dangerSoft : c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={a.icon} size={20} color={a.danger ? c.danger : c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong" color={a.danger ? c.danger : c.text}>{a.label}</T>
            {a.hint ? <T v="caption" color={c.textMuted}>{a.hint}</T> : null}
          </View>
        </Pressy>
      ))}
    </Sheet>
  );
}

/** Pick one of several options in a sheet (used for stage, priority, status, group…). */
export function OptionSheet<K extends string | number>({ visible, onClose, title, options, value, onPick }: {
  visible: boolean; onClose: () => void; title: string; options: { key: K; label: string; icon?: IconName; color?: string }[]; value?: K | null; onPick: (k: K) => void;
}) {
  const { c } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {options.map((o, i) => (
        <Pressy key={String(o.key)} scale={0.99} accessibilityLabel={o.label} accessibilityRole="radio" accessibilityState={{ selected: o.key === value }}
          onPress={() => { haptic.tap(); onPick(o.key); onClose(); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 54, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.border }}>
          {o.color ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: o.color }} /> : o.icon ? <Ionicons name={o.icon} size={20} color={c.primary} /> : null}
          <T v="body" style={{ flex: 1 }}>{o.label}</T>
          {o.key === value ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
        </Pressy>
      ))}
    </Sheet>
  );
}
