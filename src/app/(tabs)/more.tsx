import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../ctx/AppContext';
import { useTheme } from '../../ctx/ThemeContext';
import { Card, Credit, Header, Row, Screen, T } from '../../ui/kit';
import { Logo } from '../../ui/Logo';
import { APP_NAME, APP_TAGLINE } from '../../lib/brand';
import { space, TAB_SPACE } from '../../lib/theme';

export default function More() {
  const router = useRouter();
  const { c } = useTheme();
  const { settings } = useApp();
  const go = (p: string) => () => router.push(p as any);
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: space.lg }}>
      <T v="overline" color={c.textMuted} style={{ marginBottom: space.sm, marginLeft: 4 }}>{title}</T>
      <Card pad={0}>{children}</Card>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="More" subtitle={settings.businessName} />
      <Screen contentStyle={{ paddingBottom: TAB_SPACE + space.xl }}>
        <Group title="Insights">
          <Row icon="stats-chart" iconColor={c.primary} title="Analytics" subtitle="Sales, growth and activity trends" onPress={go('/analytics')} chevron last />
        </Group>
        <Group title="Organize">
          <Row icon="albums" iconColor={c.secondary} title="Groups & tags" subtitle="Segment your customers" onPress={go('/groups')} chevron />
          <Row icon="document-text" iconColor={c.accent} title="Notes" subtitle="Everything you have written down" onPress={go('/notes')} chevron last />
        </Group>
        <Group title="Data">
          <Row icon="swap-vertical" iconColor={c.success} title="Import & export" subtitle="CSV files and phone contacts" onPress={go('/import-export')} chevron />
          <Row icon="cloud-upload" iconColor={c.warning} title="Backup & restore" subtitle="Encrypted offline backups" onPress={go('/backup')} chevron last />
        </Group>
        <Group title="App">
          <Row icon="link" iconColor={c.primary} title="Integrations" subtitle="WhatsApp, calls, SMS, email, contacts" onPress={go('/integrations')} chevron />
          <Row icon="settings" iconColor={c.textMuted} title="Settings" subtitle="Appearance, security, reminders, business" onPress={go('/settings')} chevron last />
        </Group>
        <View style={{ alignItems: 'center', gap: 6, marginTop: space.md }}>
          <Logo size={44} />
          <T v="bodyStrong">{APP_NAME}</T>
          <T v="caption" color={c.textMuted}>{APP_TAGLINE}</T>
          <Credit />
        </View>
      </Screen>
    </View>
  );
}
