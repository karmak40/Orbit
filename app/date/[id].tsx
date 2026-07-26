import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { flagsValue, seeAgainValue } from '../../src/core/scoring';
import { QUESTION_IDS } from '../../src/core/model';
import { dayLabel } from '../../src/core/selectors';
import { useOrbitData } from '../../src/data/store';
import { BackButton } from '../../src/ui/BackButton';
import { DarkButton, GhostButton } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { ConfirmSheet } from '../../src/ui/ConfirmSheet';
import { DotScaleReadOnly } from '../../src/ui/DotScale';
import { Screen } from '../../src/ui/Screen';
import { alpha, color, radius, scoreColor, space, type } from '../../src/ui/theme';

const DIMENSION_LABELS: Record<string, string> = {
  chemistry: 'Chemistry',
  conversation: 'Conversation',
  comfort: 'Comfort & safety',
  fun: 'Fun',
};

export default function DateDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useOrbitData();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const d = data.dates.find((x) => x.id === id);
  if (!d) {
    return (
      <Screen>
        <BackButton label="Back" onPress={() => router.back()} />
        <Text style={styles.notFound}>This date was deleted.</Text>
      </Screen>
    );
  }

  const seeAgain = seeAgainValue(d.answers);
  const whoPaid = d.answers[QUESTION_IDS.whoPaid];
  const whoPaidValue = whoPaid?.kind === 'choice' ? whoPaid.value : null;
  const { green, red } = flagsValue(d.answers);
  const seeAgainColor = seeAgain === 'No' ? color.red : seeAgain === 'Maybe' ? color.gold : color.olive;
  const ring = scoreColor(d.score);
  const dateId = d.id;

  async function handleDelete() {
    setConfirmOpen(false);
    await data.removeDateLog(dateId);
    router.back();
  }

  return (
    <Screen>
      <BackButton label="Back" onPress={() => router.back()} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{dayLabel(d.day)}</Text>
          <Text style={styles.title}>{d.activity}</Text>
          <Text style={styles.withPerson}>with {d.personName}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.score, { color: ring }]}>{d.score}</Text>
          <Text style={styles.scoreLabel}>SCORE</Text>
        </View>
      </View>

      <Card style={{ marginBottom: space.md }}>
        <Text style={styles.sectionLabel}>How you rated it</Text>
        <View style={{ gap: 13 }}>
          {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
            const a = d.answers[key];
            const value = a?.kind === 'scale5' ? a.value : 0;
            if (!value) return null;
            return (
              <View key={key} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{label}</Text>
                <DotScaleReadOnly value={value} />
              </View>
            );
          })}
        </View>
      </Card>

      <View style={styles.tileRow}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.tileKicker}>SEE AGAIN</Text>
          <Text style={[styles.tileValue, { color: seeAgainColor }]}>{seeAgain ?? '—'}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.tileKicker}>WHO PAID</Text>
          <Text style={styles.tileValue}>{whoPaidValue ?? '—'}</Text>
        </Card>
      </View>

      {green.length || red.length ? (
        <Card style={{ marginTop: space.md }}>
          <Text style={styles.sectionLabel}>Flags</Text>
          <View style={styles.wrap}>
            {green.map((f) => (
              <View key={f} style={[styles.flag, { backgroundColor: alpha(color.olive, 0.13) }]}>
                <Text style={[styles.flagText, { color: color.olive }]}>✓ {f}</Text>
              </View>
            ))}
            {red.map((f) => (
              <View key={f} style={[styles.flag, { backgroundColor: alpha(color.red, 0.11) }]}>
                <Text style={[styles.flagText, { color: color.red }]}>⚑ {f}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: space.md, marginBottom: space.xl }}>
        <Text style={styles.sectionLabel}>Your note</Text>
        <Text style={styles.note}>{d.note || 'No note on this one.'}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <DarkButton label="Edit answers" onPress={() => router.push({ pathname: '/log', params: { editingId: dateId } })} />
        </View>
        <View style={{ flex: 0 }}>
          <GhostButton label="Delete" tone="danger" onPress={() => setConfirmOpen(true)} />
        </View>
      </View>

      <ConfirmSheet
        visible={confirmOpen}
        title="Delete this date?"
        body="The answers, notes, and score all go. Your level and streak stay as they are."
        cta="Delete date"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notFound: { ...type.body, color: color.muted, marginTop: space.xl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, marginTop: space.lg, marginBottom: space.xl },
  kicker: { ...type.metaXs, letterSpacing: 0.8, textTransform: 'uppercase', color: color.faint, marginBottom: 4 },
  title: { ...type.title, color: color.ink },
  withPerson: { ...type.label, color: color.muted, marginTop: 4 },
  score: { ...type.metric },
  scoreLabel: { ...type.metaXs, letterSpacing: 0.8, color: color.faint, marginTop: 2 },
  sectionLabel: { ...type.metaXs, letterSpacing: 0.8, textTransform: 'uppercase', color: color.faint, marginBottom: space.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingLabel: { ...type.label, color: color.ink },
  tileRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  tileKicker: { ...type.metaXs, letterSpacing: 0.6, color: color.faint },
  tileValue: { ...type.rowTitleLg, color: color.ink, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  flag: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.pill },
  flagText: { ...type.metaSm, fontFamily: type.rowTitle.fontFamily },
  note: { ...type.quote, color: color.text },
});
