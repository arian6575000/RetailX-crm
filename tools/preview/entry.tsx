// Browser preview harness: renders real screens (real Repo + SQLite via sql.js) at phone size in light/dark.
// Usage: node tools/preview/build.mjs && node tools/preview/shoot.mjs
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../../src/ctx/AppContext';
import { initRepo, Repo } from '../../src/db/repo';
import { fromSqlJs } from './sqljsDb';
import { seed } from './seed';
import { setHapticsEnabled } from '../../src/lib/haptics';
import Dashboard from '../../src/app/(tabs)/index';
import Customers from '../../src/app/(tabs)/customers';
import FollowUps from '../../src/app/(tabs)/followups';
import Pipeline from '../../src/app/(tabs)/pipeline';
import More from '../../src/app/(tabs)/more';
import Profile from '../../src/app/customer/[id]';
import CustomerEdit from '../../src/app/customer/edit';
import FollowUpEdit from '../../src/app/followup/edit';
import LeadEdit from '../../src/app/lead/edit';
import Analytics from '../../src/app/analytics';
import Groups from '../../src/app/groups';
import Notes from '../../src/app/notes';
import ImportExport from '../../src/app/import-export';
import Backup from '../../src/app/backup';
import Settings from '../../src/app/settings';
import Integrations from '../../src/app/integrations';
import { TabBar } from '../../src/app/(tabs)/_layout';
import { Onboarding } from '../../src/ui/Onboarding';
import { Splash } from '../../src/ui/Splash';
import LicenseGate from '../../src/license/LicenseGate';

const TABS = ['index', 'customers', 'pipeline', 'followups', 'more'];
const SCREENS: Record<string, { C: React.ComponentType<any>; tab?: string }> = {
  dashboard: { C: Dashboard, tab: 'index' }, customers: { C: Customers, tab: 'customers' }, pipeline: { C: Pipeline, tab: 'pipeline' }, followups: { C: FollowUps, tab: 'followups' }, more: { C: More, tab: 'more' },
  profile: { C: Profile }, 'customer-edit': { C: CustomerEdit }, 'followup-edit': { C: FollowUpEdit }, 'lead-edit': { C: LeadEdit },
  analytics: { C: Analytics }, groups: { C: Groups }, notes: { C: Notes }, 'import-export': { C: ImportExport }, backup: { C: Backup }, settings: { C: Settings }, integrations: { C: Integrations },
  onboarding: { C: Onboarding }, splash: { C: Splash }, license: { C: () => <LicenseGate><View /></LicenseGate> },
};

function Stage({ screen, theme, ids }: { screen: string; theme: string; ids: number[] }) {
  const { settings, saveSettings } = useApp();
  const [ready, setReady] = useState(false);
  useEffect(() => { (async () => { await saveSettings({ ...settings, theme: theme as any, onboarded: true, businessName: 'Al-Noor Traders', ownerName: 'Ali Raza', haptics: false }); setHapticsEnabled(false); setReady(true); setTimeout(() => ((window as any).__READY__ = true), 1800); })(); }, []);
  const s = SCREENS[screen]; if (!s || !ready) return null;
  const C = s.C;
  return (
    <View style={{ flex: 1 }}>
      <C />
      {s.tab ? <TabBar {...({ state: { index: TABS.indexOf(s.tab), routes: TABS.map((n) => ({ key: n, name: n })) }, emitter: { emit: () => ({ defaultPrevented: false }) }, navigateToTab: () => {}, descriptors: {}, insets: { top: 0, bottom: 0, left: 0, right: 0 } } as any)} /> : null}
    </View>
  );
}

(async () => {
  const q = new URLSearchParams(location.hash.slice(1));
  const screen = q.get('screen') || 'dashboard', theme = q.get('theme') || 'light', empty = q.get('empty') === '1';
  const SQL = await (window as any).initSqlJs({ locateFile: (f: string) => f });
  await initRepo(fromSqlJs(new SQL.Database()));
  const ids = empty ? [] : await seed();
  (globalThis as any).__PARAMS__ = { id: String(q.get('id') || ids[0] || ''), customerId: q.get('customerId') || '' };
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  createRoot(document.getElementById('root')!).render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 32, bottom: 16, left: 0, right: 0 } }}>
      <View style={{ width: 390, height: 844, overflow: 'hidden' } as any}>
        <AppProvider><Stage screen={screen} theme={theme} ids={ids} /></AppProvider>
      </View>
    </SafeAreaProvider>,
  );
})();
