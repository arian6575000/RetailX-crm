import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SQLite from 'expo-sqlite';
import * as ScreenCapture from 'expo-screen-capture';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { AppProvider, useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { initRepo } from '../db/repo';
import { fromExpo } from '../db/expoAdapter';
import { hasPin } from '../lib/lock';
import { LockScreen } from '../ui/LockScreen';
import { Splash } from '../ui/Splash';
import { Onboarding } from '../ui/Onboarding';
import LicenseGate from '../license/LicenseGate';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { c, isDark } = useTheme();
  const { settings } = useApp();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {settings.onboarded ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right', animationDuration: 260 }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="customer/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="lead/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="followup/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      ) : <Onboarding />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [minSplash, setMinSplash] = useState(false);

  // Customer data: no screenshots / screen recording, and the recents thumbnail is blanked (Android FLAG_SECURE).
  useEffect(() => { ScreenCapture.preventScreenCaptureAsync().catch(() => {}); }, []);
  useEffect(() => { const id = setTimeout(() => setMinSplash(true), 1300); return () => clearTimeout(id); }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync('retailx-crm.db');
        await initRepo(fromExpo(db));
        setLocked(await hasPin());
        setDbReady(true);
      } catch (e: any) { setDbError(String(e?.message || e)); }
    })();
  }, []);

  // Re-lock after a minute in the background.
  const hiddenAt = useRef(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (s) => {
      if (s === 'background' || s === 'inactive') { if (!hiddenAt.current) hiddenAt.current = Date.now(); return; }
      if (s === 'active' && hiddenAt.current && Date.now() - hiddenAt.current > 60000 && (await hasPin())) setLocked(true);
      hiddenAt.current = 0;
    });
    return () => sub.remove();
  }, []);

  const ready = (fontsLoaded || !!fontError) && dbReady;
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  const unlock = useCallback(() => setLocked(false), []);

  if (dbError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#101321' }}><Text style={{ color: '#FF8A85', fontWeight: '700', fontSize: 17 }}>Could not open the database</Text><Text style={{ marginTop: 8, color: '#B5BBD8', textAlign: 'center' }}>{dbError}</Text></View>;
  }
  if (!ready || !minSplash) return <Splash />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <LicenseGate><Shell /></LicenseGate>
        {locked ? <LockScreen onUnlock={unlock} /> : null}
      </AppProvider>
    </SafeAreaProvider>
  );
}
