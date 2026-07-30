// Imported per weight rather than from the package root: the root re-exports all
// 18 Hanken weights, and Metro would bundle every one of them (~900 KB unused).
import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold';
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold';
import { HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk/800ExtraBold';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OrbitDataProvider, useOrbitData } from '../src/data/store';
import i18n, { resolveLocale } from '../src/i18n';
import { schedulePostDateNudge, scheduleWeeklyReflection } from '../src/platform/notifications';
import { clearPasscode } from '../src/platform/passcode';
import { AppErrorScreen } from '../src/ui/AppErrorScreen';
import { DataRecovery } from '../src/ui/DataRecovery';
import { Lock } from '../src/ui/Lock';
import { Onboarding, type OnboardingResult } from '../src/ui/Onboarding';
import { Splash } from '../src/ui/Splash';
import { color } from '../src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** How long the design's splash (design/Dating Tracker.dc.html:37-53) holds before advancing. */
const SPLASH_HOLD_MS = 2100;

/**
 * Inside `OrbitDataProvider` (needs `useOrbitData`), so the animated splash's
 * minimum hold and the database's actual startup work — opening SQLite,
 * seeding built-in questions — run concurrently rather than back to back.
 */
function RootNavigator() {
  const data = useOrbitData();
  const { t } = useTranslation();
  const [holdElapsed, setHoldElapsed] = useState(false);
  // Starts locked whenever the lock is on — including right after a cold
  // start — and only flips open via a correct PIN/Face ID, or right after
  // Onboarding creates a fresh passcode (no need to immediately re-prompt for
  // the code the user just typed). Backgrounding the app re-locks it below.
  const [sessionUnlocked, setSessionUnlocked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHoldElapsed(true), SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  // Keeps i18next in sync with Settings.language, whichever changed it —
  // onboarding, the Settings picker, or (on 'system') a fresh OS-locale read.
  useEffect(() => {
    if (!data.ready) return;
    const locale = resolveLocale(data.settings.language);
    if (i18n.language !== locale) i18n.changeLanguage(locale);
  }, [data.ready, data.settings.language]);

  const lockEnabled = data.ready && data.settings.privacy.lock;
  const lockEnabledRef = useRef(lockEnabled);
  lockEnabledRef.current = lockEnabled;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && lockEnabledRef.current) setSessionUnlocked(false);
    });
    return () => sub.remove();
  }, []);

  // Re-arms reminders on every cold start — scheduled local notifications
  // don't survive a reinstall, but `Settings.reminders` does, so a fresh
  // process needs to bring the OS back in sync with what's already been
  // chosen rather than waiting for the user to re-toggle it in Settings.
  // Skipped while `corrupted`, when `settings` is just the in-memory default
  // rather than the user's real, unreadable choice.
  useEffect(() => {
    if (!data.ready || data.corrupted) return;
    if (data.settings.reminders.postDate) {
      schedulePostDateNudge({ title: t('notifications.postDateNudge.title'), body: t('notifications.postDateNudge.body') });
    }
    if (data.settings.reminders.weekly) {
      scheduleWeeklyReflection({ title: t('notifications.weeklyReflection.title'), body: t('notifications.weeklyReflection.body') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.ready, data.corrupted]);

  const showSplash = !holdElapsed || !data.ready;
  // Checked before Onboarding/Lock: a corrupted load leaves `settings` at its
  // in-memory default, which would otherwise read as "never onboarded" and
  // silently drop the user into a fresh Onboarding flow over a database it
  // can't actually use, instead of surfacing the real problem.
  const showDataError = !showSplash && data.corrupted;
  const showOnboarding = !showSplash && !showDataError && !data.settings.onboardedAt;
  const showLock = !showSplash && !showDataError && !showOnboarding && lockEnabled && !sessionUnlocked;

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <Splash />
      </>
    );
  }

  if (showDataError) {
    return (
      <>
        <StatusBar style="dark" />
        <DataRecovery onRecover={data.recoverFromCorruption} />
      </>
    );
  }

  if (showOnboarding) {
    const finishOnboarding = (result: OnboardingResult) => {
      data.saveSettings({ ...result, onboardedAt: new Date().toISOString() });
      // Just created the passcode a moment ago — no need to immediately re-ask for it.
      setSessionUnlocked(true);
    };
    return (
      <>
        <StatusBar style="dark" />
        <Onboarding onComplete={finishOnboarding} />
      </>
    );
  }

  if (showLock) {
    // No account and nothing to verify identity against in a fully offline
    // app — there is no safe way to confirm "this is really the owner" other
    // than the code itself. Letting a forgotten code just wave the user
    // through would make the lock a no-op: anyone who picks up the phone
    // could tap the same link. So recovery has to cost the same thing losing
    // the phone would: the journal itself, via the same wipe as Settings'
    // "Reset to empty state" (`resetToEmpty` — drops and re-migrates every
    // table, including `settings`, which is what sends the user back through
    // Onboarding right after).
    const forgotPasscode = async () => {
      await clearPasscode();
      await data.resetToEmpty();
    };
    return (
      <>
        <StatusBar style="light" />
        <Lock
          biometricEnabled={data.settings.privacy.biometric}
          onUnlock={() => setSessionUnlocked(true)}
          onForgotPasscode={forgotPasscode}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.surface },
        }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <AppErrorScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  useEffect(() => {
    // Hand off to the in-app animated splash once type is ready. Failing to load
    // a font must not leave the user staring at the native splash forever.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <OrbitDataProvider>
        <RootNavigator />
      </OrbitDataProvider>
    </SafeAreaProvider>
  );
}
