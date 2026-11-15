import React from 'react';
import { Linking, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { useData } from '../lib/hooks';
import { useLicense } from '../license/LicenseGate';
import { Fmt } from '../lib/format';
import { space } from '../lib/theme';
import { Badge, Card, Credit, Header, Row, Screen, SectionHeader, T } from '../ui/kit';

export default function Integrations() {
  const router = useRouter();
  const { c } = useTheme();
  const { settings } = useApp();
  const lic = useLicense();
  const { data } = useData(async () => {
    const [ct, nt] = await Promise.all([Contacts.getPermissionsAsync().catch(() => null), Notifications.getPermissionsAsync().catch(() => null)]);
    return { contacts: !!ct?.granted, notify: !!nt?.granted };
  }, []);
  const state = (on: boolean | undefined, yes = 'Allowed', no = 'Not allowed') => <Badge tone={on ? 'success' : 'neutral'} label={on ? yes : no} />;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Integrations" subtitle="Works with the apps already on your phone" back />
      <Screen>
        <SectionHeader title="Reach customers" />
        <Card pad={0}>
          <Row icon="logo-whatsapp" iconColor={c.success} title="WhatsApp" subtitle={`Opens chats with +${settings.countryCode} numbers`} right={<Badge tone="success" label="Ready" />} onPress={() => router.push('/settings')} />
          <Row icon="call" iconColor={c.primary} title="Phone calls" subtitle="One tap from any customer" right={<Badge tone="success" label="Ready" />} />
          <Row icon="chatbubble" iconColor={c.secondary} title="SMS" subtitle="Opens your messaging app" right={<Badge tone="success" label="Ready" />} />
          <Row icon="mail" iconColor={c.accent} title="Email" subtitle="Opens your mail app" right={<Badge tone="success" label="Ready" />} last />
        </Card>
        <View style={{ height: space.lg }} />
        <SectionHeader title="Phone access" />
        <Card pad={0}>
          <Row icon="people-circle" iconColor={c.accent} title="Contacts" subtitle="Import and quick-fill customer details" right={state(data?.contacts)} onPress={() => Linking.openSettings()} />
          <Row icon="notifications" iconColor={c.warning} title="Reminders" subtitle="Local follow-up notifications at your chosen hour" right={state(data?.notify && settings.notifyEnabled, 'On', 'Off')} onPress={() => router.push('/settings')} last />
        </Card>
        <View style={{ height: space.lg }} />
        <SectionHeader title="Data" />
        <Card pad={0}>
          <Row icon="document-text" iconColor={c.success} title="CSV files" subtitle="Excel and Google Sheets compatible" onPress={() => router.push('/import-export')} chevron />
          <Row icon="cloud-upload" iconColor={c.primary} title="Backups" subtitle="Share encrypted files to Drive or WhatsApp" onPress={() => router.push('/backup')} chevron last />
        </Card>
        <View style={{ height: space.lg }} />
        <SectionHeader title="License" />
        <Card pad={0}>
          <Row icon="ribbon" iconColor={c.secondary} title={lic?.payload.plan_name || 'License'} subtitle={lic ? `${lic.payload.client_name} · ${lic.payload.is_lifetime ? 'Lifetime' : `expires ${lic.payload.expiry_date}${lic.daysLeft != null ? ` (${lic.daysLeft} days)` : ''}`}` : 'Active'} last />
        </Card>
        <T v="caption" color={c.textMuted} style={{ marginTop: space.md }}>Everything runs on this device. No account, no cloud, no internet needed.</T>
        <View style={{ marginTop: space.lg }}><Credit /></View>
      </Screen>
    </View>
  );
}
