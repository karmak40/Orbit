import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MIN_DATES_FOR_PATTERNS, MIN_DATES_FOR_REFLECTIONS } from '../src/core/features';
import { LocalHeuristicInsights, localReflect } from '../src/core/insightHeuristics';
import { buildInsightsData, buildReflectionInput } from '../src/core/insights';
import { ACTIVITIES, GREEN_FLAGS, RED_FLAGS } from '../src/core/model';
import { today, useOrbitData } from '../src/data/store';
import { BackButton } from '../src/ui/BackButton';
import { Card } from '../src/ui/Card';
import { tReflectionText, translateEnum } from '../src/ui/i18nHelpers';
import { TrendChart } from '../src/ui/TrendChart';
import { alpha, color, radius, scoreColor, space, type } from '../src/ui/theme';

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const data = useOrbitData();
  const { t } = useTranslation();
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const dateCount = data.dates.length;

  const insights = useMemo(
    () => buildInsightsData(data.dates, data.questions, today()),
    [data.dates, data.questions]
  );

  const reflection = useMemo(() => {
    if (dateCount < MIN_DATES_FOR_REFLECTIONS) return null;
    const input = buildReflectionInput(data.dates, data.people.length, data.questions, data.settings.goal);
    return localReflect(input);
  }, [dateCount, data.dates, data.people.length, data.questions, data.settings.goal]);

  function handleFeedback(helpful: boolean) {
    setFeedbackGiven(true);
    if (reflection) void LocalHeuristicInsights.submitFeedback(reflection.id, helpful);
  }

  if (dateCount < MIN_DATES_FOR_PATTERNS) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.header}>
          <BackButton label={t('nav.home')} onPress={() => router.back()} />
        </View>
        <View style={styles.lockedWrap}>
          <Text style={styles.lockedTitle}>{t('insights.locked.title')}</Text>
          <Text style={styles.lockedBody}>
            {t('insights.locked.body', { count: MIN_DATES_FOR_PATTERNS - dateCount })}
          </Text>
        </View>
      </View>
    );
  }

  const delta = insights.scoreDeltaVsPriorMonth;
  const deltaText =
    delta === null
      ? t('insights.vsLastMonth_none')
      : delta > 0
        ? t('insights.vsLastMonth_positive', { delta })
        : delta < 0
          ? t('insights.vsLastMonth_negative', { delta: Math.abs(delta) })
          : t('insights.vsLastMonth_flat');
  const deltaColor = delta === null || delta === 0 ? color.faint : delta > 0 ? color.olive : color.red;

  const moodDelta = insights.moodBefore !== null && insights.moodAfter !== null ? insights.moodAfter - insights.moodBefore : 0;
  const moodParams = { before: insights.moodBefore?.toFixed(1) ?? '', after: insights.moodAfter?.toFixed(1) ?? '' };
  const moodTakeaway =
    moodDelta >= 0.3
      ? t('insights.moodTakeaway_positive', moodParams)
      : moodDelta <= -0.3
        ? t('insights.moodTakeaway_negative', moodParams)
        : t('insights.moodTakeaway_flat', moodParams);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }]}>
      <View style={styles.header}>
        <BackButton label={t('nav.home')} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('insights.title')}</Text>
        <Text style={styles.sub}>{t('insights.sub', { count: dateCount })}</Text>

        {reflection ? (
          <View style={styles.reflectionCard}>
            <View style={styles.reflectionKickerRow}>
              <View style={styles.dot} />
              <Text style={styles.reflectionKicker}>{t('insights.reflection.kicker')}</Text>
            </View>
            <Text style={styles.reflectionBody}>{tReflectionText(t, reflection.body, reflection.bodyParams)}</Text>
            {reflection.suggestion ? (
              <Text style={styles.reflectionSuggestion}>
                {tReflectionText(t, reflection.suggestion, reflection.suggestionParams)}
              </Text>
            ) : null}
            {!feedbackGiven ? (
              <View style={styles.reflectionButtons}>
                <Pressable onPress={() => handleFeedback(true)} accessibilityRole="button" style={styles.reflectionButton}>
                  <Text style={styles.reflectionButtonText}>{t('insights.reflection.helpful')}</Text>
                </Pressable>
                <Pressable onPress={() => handleFeedback(false)} accessibilityRole="button" style={styles.reflectionButton}>
                  <Text style={[styles.reflectionButtonText, styles.reflectionButtonTextMuted]}>
                    {t('insights.reflection.notForMe')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.reflectionThanks}>{t('insights.reflection.thanks')}</Text>
            )}
          </View>
        ) : dateCount < MIN_DATES_FOR_REFLECTIONS ? (
          <View style={styles.lockedTeaser}>
            <Text style={styles.lockedTeaserText}>
              {t('insights.reflectionsLocked', { count: MIN_DATES_FOR_REFLECTIONS })}
            </Text>
          </View>
        ) : null}

        {insights.scoreTrend.length >= 2 ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('insights.scoreOverTime')}</Text>
            <Text style={[styles.deltaText, { color: deltaColor }]}>{deltaText}</Text>
            <TrendChart points={insights.scoreTrend} />
          </Card>
        ) : null}

        {insights.byActivity.length > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('insights.averageByActivity')}</Text>
            <View style={{ gap: space.md }}>
              {insights.byActivity.map((a) => (
                <View key={a.activity}>
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>{translateEnum(t, 'activity', ACTIVITIES, a.activity)}</Text>
                    <Text style={[styles.barScore, { color: scoreColor(a.score) }]}>{a.score}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max(0, Math.min(100, a.score))}%`, backgroundColor: scoreColor(a.score) },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {insights.dimensionAverages.length > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('insights.yourAverages')}</Text>
            <View style={styles.dimGrid}>
              {insights.dimensionAverages.map((d) => (
                <View key={d.questionId} style={styles.dimTile}>
                  <Text style={[styles.dimValue, { color: scoreColor(d.value * 20) }]}>{d.value.toFixed(1)}</Text>
                  <Text style={styles.dimLabel}>{t(`question.${d.questionId}.label`)}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {insights.topGreenFlags.length > 0 || insights.topRedFlags.length > 0 ? (
          <View style={styles.flagRow}>
            <Card style={styles.flagCard}>
              <Text style={[styles.flagTitle, { color: color.olive }]}>{t('insights.topGreenFlags')}</Text>
              {insights.topGreenFlags.length ? (
                insights.topGreenFlags.map((f) => (
                  <View key={f.tag} style={styles.flagLine}>
                    <Text style={styles.flagName}>{translateEnum(t, 'greenFlag', GREEN_FLAGS, f.tag)}</Text>
                    <Text style={styles.flagCount}>{f.count}×</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.flagEmpty}>{t('insights.noFlagsYet')}</Text>
              )}
            </Card>
            <Card style={styles.flagCard}>
              <Text style={[styles.flagTitle, { color: color.red }]}>{t('insights.recurringRedFlags')}</Text>
              {insights.topRedFlags.length ? (
                insights.topRedFlags.map((f) => (
                  <View key={f.tag} style={styles.flagLine}>
                    <Text style={styles.flagName}>{translateEnum(t, 'redFlag', RED_FLAGS, f.tag)}</Text>
                    <Text style={styles.flagCount}>{f.count}×</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.flagEmpty}>{t('insights.noFlagsYet')}</Text>
              )}
            </Card>
          </View>
        ) : null}

        {insights.moodSampleCount > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('insights.moodLiftTitle')}</Text>
            <View style={styles.moodRow}>
              <View style={styles.moodPoint}>
                <Text style={styles.moodValue}>{insights.moodBefore!.toFixed(1)}</Text>
                <Text style={styles.moodPointLabel}>{t('insights.before')}</Text>
              </View>
              <View style={styles.moodLine} />
              <View style={styles.moodPoint}>
                <Text style={[styles.moodValue, { color: moodDelta >= 0 ? color.olive : color.red }]}>
                  {insights.moodAfter!.toFixed(1)}
                </Text>
                <Text style={styles.moodPointLabel}>{t('insights.after')}</Text>
              </View>
            </View>
            <Text style={styles.moodTakeaway}>{moodTakeaway}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  header: { paddingHorizontal: space.gutter },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: space.xxl },

  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  lockedTitle: { ...type.titleSm, fontSize: 22, color: color.ink, textAlign: 'center', marginBottom: space.sm },
  lockedBody: { ...type.bodySm, color: color.faint, textAlign: 'center' },

  title: { ...type.screenTitle, color: color.ink, marginTop: space.sm, marginBottom: 4 },
  sub: { ...type.meta, color: color.faint, marginBottom: space.xl },

  reflectionCard: {
    backgroundColor: color.ink,
    borderRadius: radius.hero,
    padding: space.xl,
    marginBottom: space.md,
  },
  reflectionKickerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.gold },
  reflectionKicker: { ...type.kicker, color: color.gold },
  reflectionBody: { ...type.quoteLg, color: color.onInk, marginBottom: space.md },
  reflectionSuggestion: { ...type.bodyXs, color: color.onInkSoft, marginBottom: space.lg },
  reflectionButtons: { flexDirection: 'row', gap: space.sm },
  reflectionButton: {
    flex: 1,
    backgroundColor: 'rgba(242,236,227,.09)',
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reflectionButtonText: { ...type.buttonSm, fontSize: 12, color: color.onInk },
  reflectionButtonTextMuted: { color: color.onInkSoft },
  reflectionThanks: { ...type.metaSm, color: color.onInkSoft },

  lockedTeaser: {
    borderWidth: 1,
    borderColor: color.cardBorderDashed,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.md,
  },
  lockedTeaserText: { ...type.metaSm, color: color.faint, textAlign: 'center' },

  card: { marginBottom: space.md },
  sectionLabel: { ...type.sectionLabel, color: color.faint, marginBottom: 4 },
  deltaText: { ...type.metaSm, marginBottom: space.md },

  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { ...type.rowTitle, color: color.ink },
  barScore: { ...type.rowTitle },
  barTrack: { height: 7, backgroundColor: color.cardBorderStrong, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },

  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  dimTile: { width: '45%' },
  dimValue: { ...type.metricSm },
  dimLabel: { ...type.rowTitle, fontSize: 11, color: color.faint, marginTop: 3 },

  flagRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  flagCard: { flex: 1 },
  flagTitle: { ...type.metaXs, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: space.md },
  flagLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  flagName: { ...type.rowTitle, fontSize: 12, color: color.ink },
  flagCount: { ...type.metaSm, color: color.faint },
  flagEmpty: { ...type.metaSm, color: color.faint },

  moodRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  moodPoint: { alignItems: 'center' },
  moodValue: { ...type.metricSm, color: color.faint },
  moodPointLabel: { ...type.metaXs, color: color.faint, marginTop: 3 },
  moodLine: { flex: 1, height: 2, backgroundColor: alpha(color.olive, 0.3), borderRadius: 1 },
  moodTakeaway: { ...type.bodyXs, color: color.textSoft, fontStyle: 'italic', marginTop: space.md },
});
