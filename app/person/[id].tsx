import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STATUSES } from '../../src/core/model';
import { dayLabel } from '../../src/core/selectors';
import { useOrbitData } from '../../src/data/store';
import { BackButton } from '../../src/ui/BackButton';
import { GhostButton, TextAction } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { ConfirmSheet } from '../../src/ui/ConfirmSheet';
import { PersonSheet, type PersonSheetInput } from '../../src/ui/PersonSheet';
import { Screen } from '../../src/ui/Screen';
import { alpha, color, radius, scoreColor, scoreTint, space, type } from '../../src/ui/theme';

export default function PersonProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useOrbitData();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const person = data.people.find((p) => p.id === id);
  if (!person) {
    return (
      <Screen>
        <BackButton label="People" onPress={() => router.back()} />
        <Text style={styles.notFound}>This person was deleted.</Text>
      </Screen>
    );
  }

  const statusDef = STATUSES.find((s) => s.id === person.status);
  const dates = data.dates.filter((d) => d.personId === person.id);
  const fresh = person.dateCount === 0;
  const avBg = fresh ? color.chipAlt : scoreTint(person.avgScore ?? 0);
  const avFg = fresh ? color.muted : scoreColor(person.avgScore ?? 0);
  const trendGlyph = { up: '▲', down: '▼', flat: '—', none: '—' }[person.trend];
  const personId = person.id;

  async function handleDelete() {
    setConfirmOpen(false);
    await data.removePerson(personId);
    router.back();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton label="People" onPress={() => router.back()} />
        <TextAction label="Edit" onPress={() => setEditOpen(true)} color={color.muted} />
      </View>

      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: avBg }]}>
          <Text style={[styles.avatarText, { color: avFg }]}>{person.name[0]?.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={[styles.status, { color: statusDef?.color ?? color.muted }]}>
            {statusDef?.label ?? person.status} · {person.source ?? 'Added by you'}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: space.lg }}>
        <GhostButton label="Update where things stand" onPress={() => setEditOpen(true)} />
      </View>

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{person.dateCount}</Text>
          <Text style={styles.statLabel}>DATES</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: fresh ? color.fainter : scoreColor(person.avgScore ?? 0) }]}>
            {fresh ? '—' : person.avgScore}
          </Text>
          <Text style={styles.statLabel}>AVG</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{trendGlyph}</Text>
          <Text style={styles.statLabel}>TREND</Text>
        </Card>
      </View>

      <Text style={styles.sectionLabel}>Date history</Text>
      <View style={{ gap: space.sm }}>
        {dates.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => router.push({ pathname: '/date/[id]', params: { id: d.id } })}
            accessibilityRole="button"
            style={styles.dateRow}>
            <View style={[styles.pill, { backgroundColor: alpha(scoreColor(d.score), 0.12) }]}>
              <Text style={[styles.pillText, { color: scoreColor(d.score) }]}>{d.score}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateActivity}>{d.activity}</Text>
              <Text style={styles.dateMeta}>{dayLabel(d.day)}</Text>
              {d.note ? <Text style={styles.dateNote}>{d.note}</Text> : null}
            </View>
          </Pressable>
        ))}
        {dates.length === 0 ? <Text style={styles.emptyDates}>No dates logged with {person.name} yet.</Text> : null}
      </View>

      <PersonSheet
        visible={editOpen}
        initial={{ name: person.name, source: person.source, status: person.status, note: person.note }}
        onCancel={() => setEditOpen(false)}
        onSave={async (input: PersonSheetInput) => {
          await data.editPerson(person.id, input);
          setEditOpen(false);
        }}
        onDelete={() => {
          setEditOpen(false);
          setConfirmOpen(true);
        }}
      />
      <ConfirmSheet
        visible={confirmOpen}
        title={`Delete ${person.name}?`}
        body="Every date logged with them is deleted too. This cannot be undone."
        cta="Delete everything"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notFound: { ...type.body, color: color.muted, marginTop: space.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.xl },
  avatar: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.title, fontSize: 26 },
  name: { ...type.title, color: color.ink },
  status: { ...type.label, marginTop: 3 },
  statRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.xxl },
  statCard: { flex: 1, alignItems: 'center', padding: 14 },
  statValue: { ...type.title, fontSize: 24, lineHeight: 28, color: color.ink },
  statLabel: { ...type.metaXs, letterSpacing: 0.6, color: color.faint, marginTop: 3 },
  sectionLabel: { ...type.sectionLabel, color: color.faint, marginBottom: space.md },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: color.card, borderWidth: 1, borderColor: color.cardBorder, borderRadius: radius.lg, padding: 14 },
  pill: { minWidth: 40, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center' },
  pillText: { ...type.rowTitle, fontSize: 15 },
  dateActivity: { ...type.rowTitle, color: color.ink },
  dateMeta: { ...type.metaSm, color: color.faint, marginTop: 1 },
  dateNote: { ...type.bodyXs, fontStyle: 'italic', color: color.textSoft, marginTop: 6 },
  emptyDates: { ...type.bodySm, color: color.faint },
});
