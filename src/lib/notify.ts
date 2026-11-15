// Local reminders for open follow-ups: one notification at each follow-up's due time. Best-effort, never throws.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Repo } from '../db/repo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensureNotifyPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('followups', { name: 'Follow-up reminders', importance: Notifications.AndroidImportance.DEFAULT });
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch { return false; }
}

export async function cancelReminders() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch { /* ignore */ }
}

export async function syncReminders() {
  try {
    const s = await Repo.getSettings();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s.notifyEnabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const [open, customers] = await Promise.all([Repo.listFollowUps({ done: false }), Repo.customerMap()]);
    const now = Date.now();
    const upcoming = open.filter((f) => f.dueAt > now).slice(0, 60); // platforms cap pending local notifications (iOS: 64)
    for (const f of upcoming) {
      const who = f.customerId ? customers[f.customerId]?.name : '';
      await Notifications.scheduleNotificationAsync({
        content: { title: f.priority === 'high' ? 'High priority follow-up' : 'Follow-up due', body: who ? `${f.title} — ${who}` : f.title },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(f.dueAt), channelId: 'followups' },
      });
    }
  } catch { /* reminders are best-effort */ }
}
