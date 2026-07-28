import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flagsValue, seeAgainValue } from '../../../src/core/scoring';
import { ACTIVITIES, GREEN_FLAGS, QUESTION_IDS, RED_FLAGS, SEE_AGAIN, WHO_PAID } from '../../../src/core/model';
import { dayLabel } from '../../../src/core/selectors';
import { useOrbitData } from '../../../src/data/store';
import { BackButton } from '../../../src/ui/BackButton';
import { DarkButton, GhostButton } from '../../../src/ui/Button';
import { Card } from '../../../src/ui/Card';
import { ConfirmSheet } from '../../../src/ui/ConfirmSheet';
import { DotScaleReadOnly } from '../../../src/ui/DotScale';
import { translateEnum } from '../../../src/ui/i18nHelpers';
import { Screen } from '../../../src/ui/Screen';
import { alpha, color, radius, scoreColor, space, type } from '../../../src/ui/theme';

const DIMENSION_KEYS = ['chemistry', 'conversation', 'comfort', 'fun'] as const;

export default function DateDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useOrbitData();
  const { t, i18n } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const d = data.dates.find((x) => x.id === id);
  if (!d) {
    return (
      <Screen>
        <BackButton label={t('dateDetail.back')} onPress={() => router.back()} />
        <Text style={styles.notFound}>{t('dateDetail.notFound')}</Text>
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
      <BackButton label={t('dateDetail.back')} onPress={() => router.back()} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{dayLabel(d.day, i18n.language)}</Text>
          <Text style={styles.title}>{translateEnum(t, 'activity', ACTIVITIES, d.activity)}</Text>
          <Text style={styles.withPerson}>{t('dateDetail.withPerson', { name: d.personName })}</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/date/[id]/result', params: { id: dateId } })}
          accessibilityRole="button"
          style={{ alignItems: 'center' }}>
          <Text style={[styles.score, { color: ring }]}>{d.score}</Text>
          <Text style={styles.scoreLabel}>{t('dateDetail.score')}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/date/[id]/result', params: { id: dateId } })}
        accessibilityRole="button"
        style={styles.viewResultRow}>
        <Text style={styles.viewResultText}>{t('dateDetail.viewResult')} →</Text>
      </Pressable>

      <Card style={{ marginBottom: space.md }}>
        <Text style={styles.sectionLabel}>{t('dateDetail.howYouRatedIt')}</Text>
        <View style={{ gap: 13 }}>
          {DIMENSION_KEYS.map((key) => {
            const a = d.answers[key];
            const value = a?.kind === 'scale5' ? a.value : 0;
            if (!value) return null;
            return (
              <View key={key} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{t(`question.${key}.label`)}</Text>
                <DotScaleReadOnly value={value} />
              </View>
            );
          })}
        </View>
      </Card>

      <View style={styles.tileRow}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.tileKicker}>{t('dateDetail.seeAgain')}</Text>
          <Text style={[styles.tileValue, { color: seeAgainColor }]}>
            {seeAgain ? translateEnum(t, 'seeAgainOption', SEE_AGAIN, seeAgain) : t('common.dash')}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.tileKicker}>{t('dateDetail.whoPaid')}</Text>
          <Text style={styles.tileValue}>
            {whoPaidValue ? translateEnum(t, 'whoPaidOption', WHO_PAID, whoPaidValue) : t('common.dash')}
          </Text>
        </Card>
      </View>

      {green.length || red.length ? (
        <Card style={{ marginTop: space.md }}>
          <Text style={styles.sectionLabel}>{t('dateDetail.flags')}</Text>
          <View style={styles.wrap}>
            {green.map((f) => (
              <View key={f} style={[styles.flag, { backgroundColor: alpha(color.olive, 0.13) }]}>
                <Text style={[styles.flagText, { color: color.olive }]}>✓ {translateEnum(t, 'greenFlag', GREEN_FLAGS, f)}</Text>
              </View>
            ))}
            {red.map((f) => (
              <View key={f} style={[styles.flag, { backgroundColor: alpha(color.red, 0.11) }]}>
                <Text style={[styles.flagText, { color: color.red }]}>⚑ {translateEnum(t, 'redFlag', RED_FLAGS, f)}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: space.md, marginBottom: space.xl }}>
        <Text style={styles.sectionLabel}>{t('dateDetail.yourNote')}</Text>
        <Text style={styles.note}>{d.note || t('dateDetail.noNote')}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <DarkButton
            label={t('dateDetail.editAnswers')}
            onPress={() => router.push({ pathname: '/log', params: { editingId: dateId } })}
          />
        </View>
        <View style={{ flex: 0 }}>
          <GhostButton label={t('dateDetail.delete')} tone="danger" onPress={() => setConfirmOpen(true)} />
        </View>
      </View>

      <ConfirmSheet
        visible={confirmOpen}
        title={t('dateDetail.deleteConfirm.title')}
        body={t('dateDetail.deleteConfirm.body')}
        cta={t('dateDetail.deleteConfirm.cta')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notFound: { ...type.body, color: color.muted, marginTop: space.xl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, marginTop: space.lg, marginBottom: space.md },
  kicker: { ...type.metaXs, letterSpacing: 0.8, textTransform: 'uppercase', color: color.faint, marginBottom: 4 },
  title: { ...type.title, color: color.ink },
  withPerson: { ...type.label, color: color.muted, marginTop: 4 },
  score: { ...type.metric },
  scoreLabel: { ...type.metaXs, letterSpacing: 0.8, color: color.faint, marginTop: 2 },
  viewResultRow: { alignSelf: 'flex-start', marginBottom: space.xl },
  viewResultText: { ...type.action, color: color.red },
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
