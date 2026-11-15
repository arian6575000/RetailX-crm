import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, palettes, resolveScheme, Scheme, ThemeMode } from '../lib/theme';

interface ThemeValue { c: Colors; scheme: Scheme; isDark: boolean; mode: ThemeMode }
const Ctx = createContext<ThemeValue>({ c: palettes.light, scheme: 'light', isDark: false, mode: 'system' });
export const useTheme = () => useContext(Ctx);

/** `mode` comes from saved settings; 'system' follows the OS and updates live when it changes. */
export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const system = useColorScheme();
  const value = useMemo<ThemeValue>(() => {
    const scheme = resolveScheme(mode, system === 'dark' ? 'dark' : 'light');
    return { c: palettes[scheme], scheme, isDark: scheme === 'dark', mode };
  }, [mode, system]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
