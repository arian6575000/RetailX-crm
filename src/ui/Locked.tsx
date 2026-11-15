import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Header } from './kit';
import { useTheme } from '../ctx/ThemeContext';
import { space } from '../lib/theme';

/** Shown in place of a screen when the active license does not include its feature. */
export function LockedScreen({ title, feature }: { title: string; feature: string }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={title} back />
      <View style={{ paddingHorizontal: space.lg }}>
        <EmptyState icon="lock-closed" title="Not included in your license" message={`${feature} is not enabled for this device. Contact RetailX Solution to upgrade your license.`} />
        <Button variant="soft" label="Back" onPress={() => router.back()} block />
      </View>
    </View>
  );
}
