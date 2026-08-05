import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GOALS, type Settings } from '../src/core/model';
import { GOAL_WEIGHT_BLURB } from '../src/core/scoring';
import { useOrbitData } from '../src/data/store';
import { isBiometricAvailable } from '../src/platform/biometrics';
import { requestCalendarAccess } from '../src/platform/calendar';
import { exportDataToFile } from '../src/platform/exportData';
import {
  cancelPostDateNudge,
  cancelWeeklyReflection,
  schedulePostDateNudge,
  scheduleWeeklyReflection,
} from '../src/platform/notifications';
import { clearPasscode, setPasscode } from '../src/platform/passcode';
import { BackButton } from '../src/ui/BackButton';
import { Card } from '../src/ui/Card';
import { ConfirmSheet } from '../src/ui/ConfirmSheet';
import { PasscodeSetup } from '../src/ui/PasscodeSetup';
import { Screen } from '../src/ui/Screen';
import { SelectField } from '../src/ui/SelectField';
import { ToggleRow } from '../src/ui/Toggle';
import { color, space, type } from '../src/ui/theme';

const SUPPORT_EMAIL = 'konstantin.hordx@gmail.com';

/** Language names are shown in their own language, never translated. */
const LANGUAGE_NAMES: Record<Exclude<Settings['language'], 'system'>, string> = {
  en: 'English',
  de: 'Deutsch',
  ru: 'Русский',
  uk: 'Українська',
};

/**
 * Question toggles, reminders, and the passcode/biometric switches all
 * enforce what they say: reminders schedule/cancel real local notifications
 * (`src/platform/notifications.ts`), the passcode lock actually gates app
 * launch (`app/_layout.tsx`), and "Read my calendar" only grants the
 * permission — the actual pre-fill happens in the log flow's "Import from
 * calendar" (`app/log.tsx`), read-only and on-demand.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const data = useOrbitData();
  const { t } = useTranslation();
  const goal = GOALS.find((g) => g.id === data.settings.goal);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [passcodeModal, setPasscodeModal] = useState<'create' | 'change' | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  async function handlePasscodeToggle(enable: boolean) {
    if (enable) {
      setPasscodeModal('create');
      return;
    }
    await clearPasscode();
    await data.saveSettings({ privacy: { ...data.settings.privacy, lock: false, biometric: false } });
  }

  async function handlePasscodeSetupDone(pin: string) {
    await setPasscode(pin);
    if (passcodeModal === 'create') {
      await data.saveSettings({ privacy: { ...data.settings.privacy, lock: true } });
    }
    setPasscodeModal(null);
  }

  async function handlePostDateToggle(enable: boolean) {
    if (enable) {
      const ok = await schedulePostDateNudge({
        title: t('notifications.postDateNudge.title'),
        body: t('notifications.postDateNudge.body'),
      });
      if (!ok) return; // permission denied (or web) — leave the toggle off
    } else {
      await cancelPostDateNudge();
    }
    await data.saveSettings({ reminders: { ...data.settings.reminders, postDate: enable } });
  }

  async function handleWeeklyToggle(enable: boolean) {
    if (enable) {
      const ok = await scheduleWeeklyReflection({
        title: t('notifications.weeklyReflection.title'),
        body: t('notifications.weeklyReflection.body'),
      });
      if (!ok) return;
    } else {
      await cancelWeeklyReflection();
    }
    await data.saveSettings({ reminders: { ...data.settings.reminders, weekly: enable } });
  }

  async function handleCalendarToggle(enable: boolean) {
    if (enable) {
      const granted = await requestCalendarAccess();
      if (!granted) return; // permission denied (or web) — leave the toggle off
    }
    await data.saveSettings({ reminders: { ...data.settings.reminders, calendar: enable } });
  }

  const languageOptions = [
    { value: 'system' as const, label: t('settings.languageSystem') },
    ...(Object.entries(LANGUAGE_NAMES) as [Exclude<Settings['language'], 'system'>, string][]).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  async function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      people: data.people,
      dates: data.dates,
      settings: data.settings,
    };
    await exportDataToFile(payload, `orbit-export-${today()}.json`);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  return (
    <Screen>
      <BackButton label={t('nav.home')} onPress={() => router.back()} />
      <Text style={styles.title}>{t('settings.title')}</Text>

      <Text style={styles.sectionLabel}>{t('settings.whatYouTrack')}</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        {data.questions.map((q, i, arr) => (
          <ToggleRow
            key={q.id}
            label={t(`question.${q.id}.label`)}
            sub={t(`question.${q.id}.sub`)}
            value={q.enabled}
            onChange={(v) => data.setQuestionEnabled(q.id, v)}
            last={i === arr.length - 1}
          />
        ))}
      </Card>

      <Text style={styles.sectionLabel}>{t('settings.reminders')}</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <ToggleRow
          label={t('settings.postDateNudge.label')}
          sub={t('settings.postDateNudge.sub')}
          value={data.settings.reminders.postDate}
          onChange={handlePostDateToggle}
        />
        <ToggleRow
          label={t('settings.weeklyReflection.label')}
          sub={t('settings.weeklyReflection.sub')}
          value={data.settings.reminders.weekly}
          onChange={handleWeeklyToggle}
        />
        <ToggleRow
          label={t('settings.readCalendar.label')}
          sub={t('settings.readCalendar.sub')}
          value={data.settings.reminders.calendar}
          onChange={handleCalendarToggle}
          last
        />
      </Card>

      <Text style={styles.sectionLabel}>{t('settings.privacy')}</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <ToggleRow
          label={t('settings.passcodeLock.label')}
          sub={t('settings.passcodeLock.sub')}
          value={data.settings.privacy.lock}
          onChange={handlePasscodeToggle}
        />
        <ToggleRow
          label={t('settings.faceId.label')}
          sub={biometricAvailable ? t('settings.faceId.sub') : t('settings.faceIdUnavailable')}
          value={data.settings.privacy.biometric}
          disabled={!data.settings.privacy.lock || !biometricAvailable}
          onChange={(v) => data.saveSettings({ privacy: { ...data.settings.privacy, biometric: v } })}
        />
        <ToggleRow
          label={t('settings.hideNames.label')}
          sub={t('settings.hideNames.sub')}
          value={data.settings.privacy.hideNames}
          onChange={(v) => data.saveSettings({ privacy: { ...data.settings.privacy, hideNames: v } })}
          last={!data.settings.privacy.lock}
        />
        {data.settings.privacy.lock ? (
          <Pressable onPress={() => setPasscodeModal('change')} accessibilityRole="button" style={styles.linkItem}>
            <Text style={styles.itemLabel}>{t('settings.changePasscode')}</Text>
          </Pressable>
        ) : null}
      </Card>

      <Modal visible={passcodeModal !== null} animationType="none" onRequestClose={() => setPasscodeModal(null)}>
        <PasscodeSetup onDone={handlePasscodeSetupDone} onCancel={() => setPasscodeModal(null)} />
      </Modal>

      <Text style={styles.sectionLabel}>{t('settings.yourIntention')}</Text>
      <Card style={{ marginBottom: space.xl }}>
        <Text style={styles.goalLabel}>{goal ? t(`goal.${goal.id}.label`) : t('goal.open.label')}</Text>
        <Text style={styles.goalSub}>{t(`goalWeightBlurb.${data.settings.goal}`)}</Text>
      </Card>

      <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
      <Card style={{ marginBottom: space.xl, padding: 0 }}>
        <SelectField
          value={data.settings.language}
          options={languageOptions}
          onChange={(language) => data.saveSettings({ language })}
          sheetTitle={t('settings.language')}
        />
      </Card>

      <Text style={styles.sectionLabel}>{t('settings.data')}</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <Pressable onPress={handleExport} accessibilityRole="button" style={[styles.linkItem, styles.divider]}>
          <Text style={styles.itemLabel}>{t('settings.exportData')}</Text>
          <Text style={styles.itemSub}>{t('settings.exportDataSub')}</Text>
        </Pressable>
        <Pressable onPress={data.fillDemo} accessibilityRole="button" style={[styles.linkItem, styles.divider]}>
          <Text style={styles.itemLabel}>{t('settings.previewSampleData')}</Text>
        </Pressable>
        <Pressable onPress={() => setResetConfirmOpen(true)} accessibilityRole="button" style={styles.linkItem}>
          <Text style={[styles.itemLabel, { color: color.red }]}>{t('settings.resetToEmpty')}</Text>
        </Pressable>
      </Card>

      <ConfirmSheet
        visible={resetConfirmOpen}
        title={t('settings.resetConfirm.title')}
        body={t('settings.resetConfirm.body')}
        cta={t('settings.resetConfirm.cta')}
        onConfirm={() => {
          setResetConfirmOpen(false);
          data.resetToEmpty();
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />

      <Text style={styles.sectionLabel}>{t('settings.about')}</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <View style={[styles.linkItem, styles.divider]}>
          <Text style={styles.itemLabel}>{t('settings.about')}</Text>
          <Text style={styles.itemSub}>{t('settings.version', { version })}</Text>
        </View>
        <Pressable
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('settings.feedbackEmailSubject'))}`
            )
          }
          accessibilityRole="button"
          style={styles.linkItem}>
          <Text style={styles.itemLabel}>{t('settings.sendFeedback')}</Text>
          <Text style={styles.itemSub}>{t('settings.sendFeedbackSub')}</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.ink, marginTop: space.md, marginBottom: space.xl },
  sectionLabel: { ...type.sectionLabel, color: color.faint, marginBottom: space.md },
  goalLabel: { ...type.quote, fontSize: 19, color: color.ink },
  goalSub: { ...type.meta, color: color.faint, marginTop: 3 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.cardBorder },
  linkItem: { paddingVertical: 14 },
  itemLabel: { ...type.label, color: color.ink },
  itemSub: { ...type.metaSm, color: color.faint, marginTop: 2 },
});
