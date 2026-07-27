import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { GOALS, type Settings } from '../src/core/model';
import { GOAL_WEIGHT_BLURB } from '../src/core/scoring';
import { useOrbitData } from '../src/data/store';
import { exportDataToFile } from '../src/platform/exportData';
import { BackButton } from '../src/ui/BackButton';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { SelectField } from '../src/ui/SelectField';
import { ToggleRow } from '../src/ui/Toggle';
import { color, space, type } from '../src/ui/theme';

/** Language names are shown in their own language, never translated. */
const LANGUAGE_NAMES: Record<Exclude<Settings['language'], 'system'>, string> = {
  en: 'English',
  de: 'Deutsch',
  ru: 'Русский',
  uk: 'Українська',
};

/**
 * Deliberately minimal for this pass: question toggles, reminders and the
 * passcode/biometric switches persist to `Settings`, but nothing yet *enforces*
 * them (no lock screen gating app launch, no scheduled notifications). That's
 * the "Privacy & platform" phase in docs/01-analysis.md §9 — a distinct piece
 * of work from the persistence + log/result/home loop this pass covers.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const data = useOrbitData();
  const { t } = useTranslation();
  const goal = GOALS.find((g) => g.id === data.settings.goal);
  const version = Constants.expoConfig?.version ?? '1.0.0';
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
          onChange={(v) => data.saveSettings({ reminders: { ...data.settings.reminders, postDate: v } })}
        />
        <ToggleRow
          label={t('settings.weeklyReflection.label')}
          sub={t('settings.weeklyReflection.sub')}
          value={data.settings.reminders.weekly}
          onChange={(v) => data.saveSettings({ reminders: { ...data.settings.reminders, weekly: v } })}
          last
        />
      </Card>

      <Text style={styles.sectionLabel}>{t('settings.privacy')}</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <ToggleRow
          label={t('settings.hideNames.label')}
          sub={t('settings.hideNames.sub')}
          value={data.settings.privacy.hideNames}
          onChange={(v) => data.saveSettings({ privacy: { ...data.settings.privacy, hideNames: v } })}
          last
        />
      </Card>

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
        <Pressable onPress={data.resetToEmpty} accessibilityRole="button" style={styles.linkItem}>
          <Text style={[styles.itemLabel, { color: color.red }]}>{t('settings.resetToEmpty')}</Text>
        </Pressable>
      </Card>

      <Text style={styles.sectionLabel}>{t('settings.about')}</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <View style={[styles.linkItem, styles.divider]}>
          <Text style={styles.itemLabel}>{t('settings.about')}</Text>
          <Text style={styles.itemSub}>{t('settings.version', { version })}</Text>
        </View>
        <Pressable
          onPress={() => Linking.openURL(`mailto:?subject=${encodeURIComponent(t('settings.feedbackEmailSubject'))}`)}
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
