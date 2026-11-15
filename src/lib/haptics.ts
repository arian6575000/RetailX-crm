// Haptic feedback, gated by the user's setting. Never throws.
import * as Haptics from 'expo-haptics';

let enabled = true;
export const setHapticsEnabled = (on: boolean) => { enabled = on; };

export const haptic = {
  tap: () => { if (enabled) Haptics.selectionAsync().catch(() => {}); },
  light: () => { if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  medium: () => { if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  success: () => { if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warning: () => { if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
  error: () => { if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};
