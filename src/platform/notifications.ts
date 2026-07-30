/**
 * Scheduled local reminders — post-date nudge and weekly reflection. Always
 * local (`scheduleNotificationAsync`), never a push token, never a server.
 * Web has no meaningful notification story here (no dev/validation need for
 * it), so every function below is a no-op on `Platform.OS === 'web'`.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const POST_DATE_NUDGE_ID = 'orbit.postDateNudge';
const WEEKLY_REFLECTION_ID = 'orbit.weeklyReflection';

if (Platform.OS !== 'web') {
  // Without a handler, a notification that fires while the app is in the
  // foreground is silently swallowed instead of shown.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export type NotificationContent = { title: string; body: string };

/** ~Evening, daily — the closest honest reading of "a gentle ping two hours after an evening out" without any real-time signal that a date is happening. */
export async function schedulePostDateNudge(content: NotificationContent): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await Notifications.cancelScheduledNotificationAsync(POST_DATE_NUDGE_ID).catch(() => {});
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: POST_DATE_NUDGE_ID,
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0 },
  });
  return true;
}

export async function cancelPostDateNudge(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(POST_DATE_NUDGE_ID).catch(() => {});
}

/** Sunday evening, matching Settings' own "Sunday summary of your week" copy. */
export async function scheduleWeeklyReflection(content: NotificationContent): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_REFLECTION_ID).catch(() => {});
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_REFLECTION_ID,
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0 },
  });
  return true;
}

export async function cancelWeeklyReflection(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_REFLECTION_ID).catch(() => {});
}
