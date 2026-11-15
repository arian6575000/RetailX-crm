import React from 'react';
import { Platform, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '../ctx/ThemeContext';
import { Chip, T } from './kit';
import { Fmt } from '../lib/format';
import { space } from '../lib/theme';

const atTime = (base: Date, h: number, m = 0) => { const d = new Date(base); d.setHours(h, m, 0, 0); return d; };

/** Quick presets (Today / Tomorrow / +3 days / Next week) plus exact date and time pickers. Value is a timestamp. */
export function DateTimeField({ label, value, onChange }: { label: string; value: number; onChange: (ts: number) => void }) {
  const { c } = useTheme();
  const cur = new Date(value);
  const preset = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); onChange(atTime(d, cur.getHours() || 10, cur.getMinutes()).getTime()); };
  const pick = (mode: 'date' | 'time') => {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: cur, mode, is24Hour: false,
      onChange: (e, d) => { if (e.type === 'set' && d) { const n = new Date(cur); if (mode === 'date') n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); else n.setHours(d.getHours(), d.getMinutes(), 0, 0); onChange(n.getTime()); } },
    });
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((new Date(cur).setHours(0, 0, 0, 0) - today.getTime()) / 86400000);
  return (
    <View style={{ marginBottom: space.lg }}>
      <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>{label}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Chip label="Today" selected={dayDiff === 0} onPress={() => preset(0)} />
        <Chip label="Tomorrow" selected={dayDiff === 1} onPress={() => preset(1)} />
        <Chip label="In 3 days" selected={dayDiff === 3} onPress={() => preset(3)} />
        <Chip label="Next week" selected={dayDiff === 7} onPress={() => preset(7)} />
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        <Chip icon="calendar" label={Fmt.date(value, true)} onPress={() => pick('date')} selected />
        <Chip icon="time" label={Fmt.time(value)} onPress={() => pick('time')} selected />
      </View>
    </View>
  );
}
