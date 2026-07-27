import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SOURCES, STATUSES } from '../../src/core/model';
import { useOrbitData } from '../../src/data/store';
import { Card } from '../../src/ui/Card';
import { translateEnum } from '../../src/ui/i18nHelpers';
import { PersonSheet, type PersonSheetInput } from '../../src/ui/PersonSheet';
import { Screen } from '../../src/ui/Screen';
import { color, radius, scoreColor, scoreTint, space, type } from '../../src/ui/theme';

export default function PeopleScreen() {
  const router = useRouter();
  const data = useOrbitData();
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('people.title')}</Text>
          <Text style={styles.sub}>{t('people.sub')}</Text>
        </View>
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('common.addPerson')}
          hitSlop={6}
          style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {data.people.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('people.nobodyHereYet')}</Text>
          <Text style={styles.emptyBody}>{t('people.nobodyHereBody')}</Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {data.people.map((p) => {
            const statusDef = STATUSES.find((s) => s.id === p.status);
            const fresh = p.dateCount === 0;
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })}
                style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: fresh ? color.chipAlt : scoreTint(p.avgScore ?? 0) }]}>
                  <Text style={[styles.avatarText, { color: fresh ? color.muted : scoreColor(p.avgScore ?? 0) }]}>
                    {p.name[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{p.name}</Text>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {p.source ? translateEnum(t, 'source', SOURCES, p.source) : t('people.addedByYou')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.status, { color: statusDef?.color ?? color.muted }]}>
                    {statusDef ? t(`status.${statusDef.id}.label`) : p.status}
                  </Text>
                  <Text style={styles.dates}>{fresh ? t('people.noDatesYet') : t('people.dateCount', { count: p.dateCount })}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.avg, { color: fresh ? color.fainter : scoreColor(p.avgScore ?? 0) }]}>
                    {fresh ? t('common.dash') : p.avgScore}
                  </Text>
                  <Text style={styles.avgLabel}>{t('people.avg')}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <PersonSheet
        visible={sheetOpen}
        onCancel={() => setSheetOpen(false)}
        onSave={async (input: PersonSheetInput) => {
          await data.addPerson(input);
          setSheetOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.xl },
  title: { ...type.screenTitle, color: color.ink, marginBottom: 4 },
  sub: { ...type.meta, color: color.faint },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: color.onInk, fontSize: 22, lineHeight: 26 },
  emptyCard: { backgroundColor: color.card, borderWidth: 1, borderColor: color.cardBorderDashed, borderStyle: 'dashed', borderRadius: radius.xl, padding: space.xl, alignItems: 'center' },
  emptyTitle: { ...type.quote, fontSize: 20, color: color.text, marginBottom: space.sm, textAlign: 'center' },
  emptyBody: { ...type.bodySm, color: color.faint, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.card, borderWidth: 1, borderColor: color.cardBorder, borderRadius: radius.xl, padding: space.lg },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.rowTitleLg, fontSize: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...type.rowTitleLg, color: color.ink },
  tag: { backgroundColor: color.chip, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 99 },
  tagText: { ...type.metaXs, color: color.faint },
  status: { ...type.meta, marginTop: 2 },
  dates: { ...type.metaSm, color: color.faint, marginTop: 1 },
  avg: { ...type.title, fontSize: 26, lineHeight: 30 },
  avgLabel: { ...type.metaXs, letterSpacing: 0.6, color: color.faint },
});
