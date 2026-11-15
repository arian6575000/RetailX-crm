import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useColorScheme, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palettes } from '../lib/theme';
import { APP_NAME, APP_TAGLINE, CREDIT } from '../lib/brand';
import { Logo } from './Logo';
import { fontFamily } from '../lib/theme';

/** Animated launch screen shown while fonts + database load (always at least ~1.2 s so the animation reads). */
export function Splash() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = palettes[scheme];
  const pop = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, speed: 9, bounciness: 10, useNativeDriver: true }),
      Animated.timing(text, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.timing(bar, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })).start();
  }, [pop, text, bar]);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
      <LinearGradient colors={scheme === 'dark' ? ['#101321', '#1A1F3D'] : ['#F7F8FC', '#E8E9FD']} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) }], opacity: pop }}>
        <Logo size={104} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', marginTop: 24, opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <Animated.Text style={{ fontFamily: fontFamily.bold, fontSize: 30, letterSpacing: -0.8, color: c.text }}>{APP_NAME}</Animated.Text>
        <Animated.Text style={{ fontFamily: fontFamily.medium, fontSize: 14, color: c.textMuted, marginTop: 4 }}>{APP_TAGLINE}</Animated.Text>
      </Animated.View>
      <View style={{ position: 'absolute', bottom: 64, width: 120, height: 4, borderRadius: 2, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
        <Animated.View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: c.primary, transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-48, 120] }) }] }} />
      </View>
      <Animated.Text style={{ position: 'absolute', bottom: 28, fontFamily: fontFamily.regular, fontSize: 12, color: c.textFaint, opacity: text }}>{CREDIT}</Animated.Text>
    </View>
  );
}
