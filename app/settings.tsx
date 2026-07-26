import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { GOALS } from '../src/core/model';
import { GOAL_WEIGHT_BLURB } from '../src/core/scoring';
import { useOrbitData } from '../src/data/store';
import { BackButton } from '../src/ui/BackButton';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { color, radius, space, type } from '../src/ui/theme';

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
  const goal = GOALS.find((g) => g.id === data.settings.goal);

  return (
    <Screen>
      <BackButton label="Home" onPress={() => router.back()} />
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>What you track</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        {data.questions.map((q, i, arr) => (
            <View key={q.id} style={[styles.toggleRow, i < arr.length - 1 && styles.toggleDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{q.label}</Text>
                <Text style={styles.toggleSub}>{q.sub}</Text>
              </View>
              <Switch
                value={q.enabled}
                onValueChange={(v) => data.setQuestionEnabled(q.id, v)}
                trackColor={{ false: color.cardBorderStrong, true: color.olive }}
                thumbColor="#fffdf9"
              />
            </View>
          ))}
      </Card>

      <Text style={styles.sectionLabel}>Reminders</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <ToggleRow
          label="Post-date nudge"
          sub="A gentle ping two hours after an evening out"
          value={data.settings.reminders.postDate}
          onChange={(v) => data.saveSettings({ reminders: { ...data.settings.reminders, postDate: v } })}
        />
        <ToggleRow
          label="Weekly reflection"
          sub="Sunday summary of your week"
          value={data.settings.reminders.weekly}
          onChange={(v) => data.saveSettings({ reminders: { ...data.settings.reminders, weekly: v } })}
          last
        />
      </Card>

      <Text style={styles.sectionLabel}>Privacy</Text>
      <Card style={{ marginBottom: space.xl, gap: 0 }}>
        <ToggleRow
          label="Hide names"
          sub="Initials only outside a profile"
          value={data.settings.privacy.hideNames}
          onChange={(v) => data.saveSettings({ privacy: { ...data.settings.privacy, hideNames: v } })}
          last
        />
      </Card>

      <Text style={styles.sectionLabel}>Your intention</Text>
      <Card style={{ marginBottom: space.xl }}>
        <Text style={styles.goalLabel}>{goal?.label ?? 'Open to anything'}</Text>
        <Text style={styles.goalSub}>{GOAL_WEIGHT_BLURB[data.settings.goal]}</Text>
      </Card>

      <Pressable onPress={data.fillDemo} accessibilityRole="button" style={styles.linkRow}>
        <Text style={styles.linkDanger}>Preview with sample data</Text>
      </Pressable>
      <Pressable onPress={data.resetToEmpty} accessibilityRole="button" style={styles.linkRow}>
        <Text style={styles.linkMuted}>Reset to empty state</Text>
      </Pressable>
    </Screen>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
  last,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.toggleDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: color.cardBorderStrong, true: color.olive }} thumbColor="#fffdf9" />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.ink, marginTop: space.md, marginBottom: space.xl },
  sectionLabel: { ...type.sectionLabel, color: color.faint, marginBottom: space.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  toggleDivider: { borderBottomWidth: 1, borderBottomColor: color.cardBorder },
  toggleLabel: { ...type.label, color: color.ink },
  toggleSub: { ...type.metaSm, color: color.faint, marginTop: 1 },
  goalLabel: { ...type.quote, fontSize: 19, color: color.ink },
  goalSub: { ...type.meta, color: color.faint, marginTop: 3 },
  linkRow: { alignItems: 'center', paddingVertical: space.sm },
  linkDanger: { ...type.action, color: color.red },
  linkMuted: { ...type.action, color: color.faint },
});
