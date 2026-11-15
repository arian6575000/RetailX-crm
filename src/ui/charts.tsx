// Interactive charts. Bars are plain Views (native-driver grow animation); donut + sparkline use react-native-svg.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../ctx/ThemeContext';
import { radius, space } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { Pressy, T } from './kit';

export interface BarDatum { label: string; value: number }

/** Tap (or press-and-hold) a bar to read its exact value. */
export function BarChart({ data, height = 150, format = (n: number) => String(n), color, summary }: { data: BarDatum[]; height?: number; format?: (n: number) => string; color?: string; summary?: string }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<number | null>(null);
  const grow = useRef(new Animated.Value(0)).current;
  const key = data.map((d) => d.value).join(',');
  useEffect(() => { grow.setValue(0); Animated.timing(grow, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [key, grow]);
  const max = Math.max(1, ...data.map((d) => d.value));
  const fill = color ?? c.primary;
  const active = sel ?? data.length - 1;
  return (
    <View accessible accessibilityLabel={summary ?? `Bar chart. ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: space.md, minHeight: 28 }}>
        <T v="title">{format(data[active]?.value ?? 0)}</T>
        <T v="caption" color={c.textMuted}>{data[active]?.label ?? ''}</T>
      </View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / max) * (height - 4));
          const on = i === active;
          return (
            <Pressable key={d.label + i} style={{ flex: 1, height, justifyContent: 'flex-end' }} onPress={() => { haptic.tap(); setSel(i); }} accessibilityRole="button" accessibilityLabel={`${d.label}: ${format(d.value)}`}>
              <Animated.View style={{ height: h, borderRadius: 8, backgroundColor: on ? fill : c.primarySoft, transform: [{ translateY: grow.interpolate({ inputRange: [0, 1], outputRange: [h, 0] }) }] }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {data.map((d, i) => <T key={d.label + i} v="caption" align="center" color={i === active ? c.text : c.textFaint} style={{ flex: 1 }}>{d.label}</T>)}
      </View>
    </View>
  );
}

export interface Segment { key: string; label: string; value: number; color: string }

export function DonutChart({ segments, size = 160, centerValue, centerLabel }: { segments: Segment[]; size?: number; centerValue?: string; centerLabel?: string }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const stroke = 20, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const prog = useRef(new Animated.Value(0)).current;
  const [p, setP] = useState(0);
  const key = segments.map((s) => s.value).join(',');
  useEffect(() => {
    prog.setValue(0);
    const id = prog.addListener(({ value }) => setP(value));
    Animated.timing(prog, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => prog.removeListener(id);
  }, [key, prog]);
  let acc = 0;
  const chosen = segments.find((s) => s.key === sel);
  return (
    <View accessible accessibilityLabel={`Donut chart. ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surfaceAlt} strokeWidth={stroke} fill="none" />
          {total > 0 ? segments.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * circ * p;
            const gap = segments.filter((x) => x.value > 0).length > 1 ? 3 : 0;
            const el = <Circle key={s.key} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={sel === s.key ? stroke + 4 : stroke} strokeLinecap="butt" fill="none" opacity={sel && sel !== s.key ? 0.35 : 1}
              strokeDasharray={`${Math.max(0, len - gap)} ${circ}`} strokeDashoffset={-acc * p} />;
            acc += (s.value / total) * circ; return el;
          }) : null}
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <T v="title">{chosen ? String(chosen.value) : centerValue ?? String(total)}</T>
          <T v="caption" color={c.textMuted} numberOfLines={1} style={{ maxWidth: size - 56 }}>{chosen ? chosen.label : centerLabel ?? 'Total'}</T>
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {segments.map((s) => (
          <Pressy key={s.key} onPress={() => setSel(sel === s.key ? null : s.key)} scale={0.98} accessibilityLabel={`${s.label}: ${s.value}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
            <T v="label" style={{ flex: 1 }} numberOfLines={1}>{s.label}</T>
            <T v="label" color={c.textMuted}>{s.value}</T>
          </Pressy>
        ))}
      </View>
    </View>
  );
}

/** Horizontal funnel: one labelled bar per stage, widths relative to the largest. */
export function HBars({ rows, format = (n: number) => String(n) }: { rows: { key: string; label: string; value: number; color: string; sub?: string }[]; format?: (n: number) => string }) {
  const { c } = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  const key = rows.map((r) => r.value).join(',');
  useEffect(() => { w.setValue(0); Animated.timing(w, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [key, w]);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: space.md }}>
      {rows.map((r) => (
        <View key={r.key} accessible accessibilityLabel={`${r.label}: ${format(r.value)}${r.sub ? ', ' + r.sub : ''}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <T v="label">{r.label}</T>
            <T v="label" color={c.textMuted}>{r.sub ? `${r.sub} · ` : ''}{format(r.value)}</T>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
            <Animated.View style={{ height: 10, borderRadius: 5, backgroundColor: r.color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(r.value ? 4 : 0, (r.value / max) * 100)}%`] }) }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function Sparkline({ values, width = 96, height = 36, color }: { values: number[]; width?: number; height?: number; color?: string }) {
  const { c } = useTheme();
  const stroke = color ?? c.primary;
  const { line, area } = useMemo(() => {
    const v = values.length > 1 ? values : [0, ...values, ...(values.length ? [] : [0])];
    const max = Math.max(1, ...v), min = Math.min(0, ...v), span = max - min || 1;
    const pts = v.map((n, i) => [(i / (v.length - 1)) * width, height - 3 - ((n - min) / span) * (height - 6)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return { line: d, area: `${d} L${width},${height} L0,${height} Z` };
  }, [values, width, height]);
  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs><SvgGradient id="sg" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={stroke} stopOpacity={0.3} /><Stop offset="1" stopColor={stroke} stopOpacity={0} /></SvgGradient></Defs>
      <Path d={area} fill="url(#sg)" />
      <Path d={line} stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
