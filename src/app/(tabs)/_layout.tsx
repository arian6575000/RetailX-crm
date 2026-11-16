// Tab navigation: a floating pill bar (distinct from the stock Android bottom bar) with an animated active indicator.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../ctx/ThemeContext';
import { elevation, fontFamily, radius, space } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { useData } from '../../lib/hooks';
import { Repo } from '../../db/repo';
import { startOfDay } from '../../lib/analytics';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type Meta = { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; active: React.ComponentProps<typeof Ionicons>['name'] };
const META: Record<string, Meta> = {
  index: { title: 'Home', icon: 'grid-outline', active: 'grid' },
  customers: { title: 'Customers', icon: 'people-outline', active: 'people' },
  pipeline: { title: 'Pipeline', icon: 'funnel-outline', active: 'funnel' },
  followups: { title: 'Follow-ups', icon: 'notifications-outline', active: 'notifications' },
  more: { title: 'More', icon: 'ellipsis-horizontal-circle-outline', active: 'ellipsis-horizontal-circle' },
};

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: due } = useData(async () => {
    const open = await Repo.listFollowUps({ done: false });
    const end = startOfDay(Date.now()) + 86400000;
    return open.filter((f) => f.dueAt < end).length;
  }, []);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View style={[{ width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', backgroundColor: c.surfaceRaised, borderRadius: radius.xl, padding: 6, borderWidth: 1, borderColor: c.border }, elevation.high]} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const m = META[route.name]; if (!m) return null;
          const focused = state.index === i;
          return <TabItem key={route.key} meta={m} focused={focused} badge={route.name === 'followups' ? due ?? 0 : 0}
            onPress={() => { const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !e.defaultPrevented) { haptic.tap(); navigateToTab(route.key); } }} />;
        })}
      </View>
    </View>
  );
}

function TabItem({ meta, focused, onPress, badge }: { meta: Meta; focused: boolean; onPress: () => void; badge: number }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => { Animated.spring(a, { toValue: focused ? 1 : 0, speed: 18, bounciness: 6, useNativeDriver: false }).start(); }, [focused, a]);
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityLabel={meta.title + (badge ? `, ${badge} due` : '')} accessibilityState={{ selected: focused }} style={{ flex: focused ? 2.1 : 1, minHeight: 52 }}>
      <Animated.View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', c.primarySoft] }), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <View>
          <Ionicons name={focused ? meta.active : meta.icon} size={23} color={focused ? c.onPrimarySoft : c.textFaint} />
          {badge > 0 && !focused ? <View style={{ position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}><Animated.Text style={{ color: '#fff', fontSize: 10, fontFamily: fontFamily.bold }}>{badge > 9 ? '9+' : badge}</Animated.Text></View> : null}
        </View>
        {focused ? <Animated.Text numberOfLines={1} style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: c.onPrimarySoft, opacity: a }}>{meta.title}</Animated.Text> : null}
      </Animated.View>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="customers" />
      <Tabs.Screen name="pipeline" />
      <Tabs.Screen name="followups" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
