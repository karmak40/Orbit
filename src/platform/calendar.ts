/**
 * Read-only calendar access to pre-fill "who and where a date was" in the log
 * flow — never writes to the calendar, never leaves the device. Web has no
 * meaningful calendar story, so every function below is a no-op there.
 */
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import { toDay } from '../core/progress';

export type CalendarEventSummary = {
  id: string;
  title: string;
  location: string | null;
  /** Local calendar day the event starts on — used to back-date an imported log entry. */
  day: string;
  startDate: string;
};

export async function isCalendarPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await Calendar.getCalendarPermissionsAsync();
  return status.granted;
}

export async function requestCalendarAccess(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Calendar.getCalendarPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
}

/** Non-all-day events from yesterday through now, most recent first — enough to cover "logging this the morning after". */
export async function recentCalendarEvents(): Promise<CalendarEventSummary[]> {
  if (Platform.OS === 'web') return [];
  const granted = await requestCalendarAccess();
  if (!granted) return [];

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarIds = calendars.map((c) => c.id);
  if (calendarIds.length === 0) return [];

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const events = await Calendar.getEventsAsync(calendarIds, start, now);
  return events
    .filter((e) => !e.allDay)
    .map((e) => {
      const startDate = new Date(e.startDate);
      return {
        id: e.id,
        title: e.title || '',
        location: e.location || null,
        day: toDay(startDate),
        startDate: startDate.toISOString(),
      };
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 8);
}
