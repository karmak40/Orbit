import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACTIVITIES, SOURCES, STATUSES } from '../../src/core/model';
import { dayLabel } from '../../src/core/selectors';
import { useOrbitData } from '../../src/data/store';
import { BackButton } from '../../src/ui/BackButton';
import { GhostButton, TextAction } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { ConfirmSheet } from '../../src/ui/ConfirmSheet';
import { translateEnum } from '../../src/ui/i18nHelpers';
import { PersonSheet, type PersonSheetInput } from '../../src/ui/PersonSheet';
import { Screen } from '../../src/ui/Screen';
import { alpha, color, radius, scoreColor, scoreTint, space, type } from '../../src/ui/theme';

export default function PersonProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useOrbitData();
  const { t, i18n } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const person = data.people.find((p) => p.id === id);
  if (!person) {
    return (
      <Screen>
        <BackButton label={t('personProfile.back')} onPress={() => router.back()} />
        <Text style={styles.notFound}>{t('personProfile.notFound')}</Text>
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
        <BackButton label={t('personProfile.back')} onPress={() => router.back()} />
        <TextAction label={t('personProfile.edit')} onPress={() => setEditOpen(true)} color={color.muted} />
      </View>

      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: avBg }]}>
          <Text style={[styles.avatarText, { color: avFg }]}>{person.name[0]?.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={[styles.status, { color: statusDef?.color ?? color.muted }]}>
            {statusDef ? t(`status.${statusDef.id}.label`) : person.status} ·{' '}
            {person.source ? translateEnum(t, 'source', SOURCES, person.source) : t('people.addedByYou')}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: space.lg }}>
        <GhostButton label={t('personProfile.updateWhereThingsStand')} onPress={() => setEditOpen(true)} />
      </View>

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{person.dateCount}</Text>
          <Text style={styles.statLabel}>{t('personProfile.dates')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: fresh ? color.fainter : scoreColor(person.avgScore ?? 0) }]}>
            {fresh ? t('common.dash') : person.avgScore}
          </Text>
          <Text style={styles.statLabel}>{t('personProfile.avg')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{trendGlyph}</Text>
          <Text style={styles.statLabel}>{t('personProfile.trend')}</Text>
        </Card>
      </View>

      <Text style={styles.sectionLabel}>{t('personProfile.dateHistory')}</Text>
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
              <Text style={styles.dateActivity}>{translateEnum(t, 'activity', ACTIVITIES, d.activity)}</Text>
              <Text style={styles.dateMeta}>{dayLabel(d.day, i18n.language)}</Text>
              {d.note ? <Text style={styles.dateNote}>{d.note}</Text> : null}
            </View>
          </Pressable>
        ))}
        {dates.length === 0 ? (
          <Text style={styles.emptyDates}>{t('personProfile.noDatesLoggedWith', { name: person.name })}</Text>
        ) : null}
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
        title={t('personProfile.deleteConfirm.title', { name: person.name })}
        body={t('personProfile.deleteConfirm.body')}
        cta={t('personProfile.deleteConfirm.cta')}
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
