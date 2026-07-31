import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_DATES_FOR_PATTERNS } from '../../src/core/features';
import { localReflect } from '../../src/core/insightHeuristics';
import { buildReflectionInput } from '../../src/core/insights';
import { ACTIVITIES } from '../../src/core/model';
import { BADGES } from '../../src/core/progress';
import { dayLabel } from '../../src/core/selectors';
import { useOrbitData } from '../../src/data/store';
import { PrimaryButton } from '../../src/ui/Button';
import { Card, InkCard } from '../../src/ui/Card';
import { tReflectionText, translateEnum } from '../../src/ui/i18nHelpers';
import { Screen } from '../../src/ui/Screen';
import { alpha, color, radius, scoreColor, space, type } from '../../src/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const data = useOrbitData();
  const { t, i18n } = useTranslation();

  if (!data.ready) return <Screen><Text style={styles.loading}>{t('common.loading')}</Text></Screen>;

  const dateHeading = new Date().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' });
  const greeting = data.settings.userName ? t('home.greetingNamed', { name: data.settings.userName }) : t('home.greeting');
  const initial = (data.settings.userName.trim()[0] || 'R').toUpperCase();

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateLabel}>{dateHeading}</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('nav.settings')} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      {data.nudgeVisible && data.dates.length > 0 ? (
        <Card style={styles.nudge}>
          <Text style={styles.nudgeTitle}>{t('home.nudge.title', { name: data.dates[0].personName })}</Text>
          <Text style={styles.nudgeBody}>{t('home.nudge.body')}</Text>
          <View style={styles.nudgeButtons}>
            <Pressable onPress={() => router.push('/log')} accessibilityRole="button" style={styles.nudgeCta}>
              <Text style={styles.nudgeCtaText}>{t('home.nudge.logIt')}</Text>
            </Pressable>
            <Pressable onPress={data.dismissNudge} accessibilityRole="button" style={styles.nudgeDismiss}>
              <Text style={styles.nudgeDismissText}>{t('home.nudge.notTonight')}</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      {!data.hasData ? (
        <EmptyHome onLog={() => router.push('/log')} onDemo={data.fillDemo} />
      ) : (
        <PopulatedHome />
      )}
    </Screen>
  );
}

const UNLOCK_STEPS = ['unlock1', 'unlock2', 'unlock3'] as const;

function EmptyHome({ onLog, onDemo }: { onLog: () => void; onDemo: () => void }) {
  const { t } = useTranslation();
  return (
    <View>
      <InkCard style={{ alignItems: 'center', marginBottom: space.lg }}>
        <View style={styles.levelBadgeDashed}>
          <Text style={styles.levelBadgeDashedText}>1</Text>
        </View>
        <Text style={styles.emptyTitle}>{t('home.empty.title')}</Text>
        <Text style={styles.emptyBody}>{t('home.empty.body')}</Text>
      </InkCard>
      <PrimaryButton label={t('home.empty.cta')} onPress={onLog} />

      <Text style={styles.sectionLabel}>{t('home.empty.unlocksHeading')}</Text>
      <View style={{ gap: space.sm }}>
        {UNLOCK_STEPS.map((key, i) => (
          <View key={key} style={styles.unlockRow}>
            <View style={styles.unlockNum}>
              <Text style={styles.unlockNumText}>{[1, 3, 5][i]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>{t(`home.empty.${key}.title`)}</Text>
              <Text style={styles.unlockSub}>{t(`home.empty.${key}.sub`)}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable onPress={onDemo} accessibilityRole="button" style={{ marginTop: space.xl, alignItems: 'center' }}>
        <Text style={styles.demoLink}>{t('home.empty.previewSampleData')}</Text>
      </Pressable>
    </View>
  );
}

function PopulatedHome() {
  const router = useRouter();
  const data = useOrbitData();
  const { t, i18n } = useTranslation();

  const earned = new Set(data.earnedBadgeIds);
  const recentBadges = BADGES.slice(0, 3);

  // "Dating Score" — an unresolved gap in the source design (docs/01-analysis.md §7.2):
  // shown but never defined there. Simplest honest reading: mean of all logged scores.
  const datingScore = data.dates.length
    ? Math.round(data.dates.reduce((s, d) => s + d.score, 0) / data.dates.length)
    : 0;
  const trendUp = data.dates.length > 1 && data.dates[0].score >= data.dates[1].score;

  const teaserReflection = useMemo(() => {
    if (data.dates.length < MIN_DATES_FOR_PATTERNS) return null;
    const input = buildReflectionInput(data.dates, data.people.length, data.questions, data.settings.goal);
    return localReflect(input);
  }, [data.dates, data.people.length, data.questions, data.settings.goal]);

  return (
    <View>
      <InkCard style={{ marginBottom: space.md }}>
        <View style={styles.levelRow}>
          <View>
            <Text style={styles.levelKicker}>{t('home.levelKicker', { level: data.level.level })}</Text>
            <Text style={styles.levelName}>{t(`level.${data.level.level}.name`)}</Text>
          </View>
          <View style={styles.levelDial}>
            <Text style={styles.levelDialText}>{data.level.level}</Text>
          </View>
        </View>
        <View style={{ marginTop: space.lg }}>
          <View style={styles.rowBetween}>
            <Text style={styles.levelXp}>{t('home.xp', { xp: data.xp })}</Text>
            <Text style={styles.levelXp}>
              {data.level.nextXp
                ? t('home.nextLevelXp', { xp: data.level.nextXp, level: data.level.level + 1 })
                : t('home.maxLevel')}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(data.level.fill * 100)}%` }]} />
          </View>
        </View>
      </InkCard>

      <View style={styles.statRow}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statKicker}>{t('home.datingScore')}</Text>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValue}>{datingScore}</Text>
            <Text style={[styles.statDelta, { color: trendUp ? color.olive : color.faint }]}>{trendUp ? '▲' : '—'}</Text>
          </View>
          <Text style={styles.statSub}>{t('home.datesLogged', { count: data.dates.length })}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statKicker}>{t('home.streak')}</Text>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValue}>{data.streakWeeks}</Text>
            <Text style={[styles.statDelta, { color: color.red }]}>{t('home.weeks')}</Text>
          </View>
          <Text style={styles.statSub}>{data.streakWeeks > 0 ? t('home.streakActiveSub') : t('home.streakInactiveSub')}</Text>
        </Card>
      </View>

      <View style={{ marginTop: space.lg }}>
        <PrimaryButton
          label={t('home.logCta')}
          sub={t('home.logCtaSub')}
          onPress={() => router.push('/log')}
          trailing={
            <View style={styles.plusCircle}>
              <Text style={styles.plusText}>+</Text>
            </View>
          }
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t('home.recentDates')}</Text>
        <Pressable onPress={() => router.push('/timeline')} accessibilityRole="button">
          <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
        </Pressable>
      </View>
      <View style={{ gap: space.sm }}>
        {data.dates.slice(0, 3).map((d) => (
          <Pressable
            key={d.id}
            onPress={() => router.push({ pathname: '/date/[id]', params: { id: d.id } })}
            accessibilityRole="button"
            style={styles.dateRow}>
            <View style={styles.dateAvatar}>
              <Text style={styles.dateAvatarText}>{d.personInitial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateName}>{d.personName}</Text>
              <Text style={styles.dateMeta}>
                {translateEnum(t, 'activity', ACTIVITIES, d.activity)} · {dayLabel(d.day, i18n.language)}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: alpha(scoreColor(d.score), 0.12) }]}>
              <Text style={[styles.pillText, { color: scoreColor(d.score) }]}>{d.score}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {teaserReflection ? (
        <Pressable onPress={() => router.push('/insights')} accessibilityRole="button" style={styles.insightTeaser}>
          <View style={styles.insightTeaserHeader}>
            <View style={styles.insightTeaserKickerRow}>
              <View style={styles.insightDot} />
              <Text style={styles.insightTeaserKicker}>{t('home.insightTeaser.kicker')}</Text>
            </View>
            <Text style={styles.insightTeaserChevron}>›</Text>
          </View>
          <Text style={styles.insightTeaserBody}>{tReflectionText(t, teaserReflection.body, teaserReflection.bodyParams)}</Text>
          <Text style={styles.insightTeaserCta}>{t('home.insightTeaser.cta')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t('home.badges')}</Text>
        <Pressable onPress={() => router.push('/awards')} accessibilityRole="button">
          <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {recentBadges.map((b) => {
          const got = earned.has(b.id);
          return (
            <Card key={b.id} style={[styles.badgeTile, { opacity: got ? 1 : 0.5 }]}>
              <View style={[styles.badgeIcon, { backgroundColor: alpha(b.color, 0.15) }]}>
                <Text style={{ color: got ? b.color : color.faint, fontSize: 18 }}>★</Text>
              </View>
              <Text style={styles.badgeTileName}>{t(`badge.${b.id}.name`)}</Text>
              <Text style={styles.badgeTileSub}>{got ? t(`badge.${b.id}.sub`) : t('awards.badgeLocked')}</Text>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { ...type.body, color: color.muted, textAlign: 'center', marginTop: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.xl },
  dateLabel: { ...type.meta, color: color.faint },
  greeting: { ...type.screenTitle, color: color.ink, marginTop: 3 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.chipDeep, borderWidth: 1, borderColor: color.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.rowTitleLg, color: color.muted },

  nudge: { backgroundColor: '#fdf3e8', borderColor: 'rgba(200,145,47,.35)', marginBottom: space.md },
  nudgeTitle: { ...type.rowTitleLg, color: color.ink },
  nudgeBody: { ...type.meta, color: color.muted, marginTop: 2 },
  nudgeButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  nudgeCta: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.gold },
  nudgeCtaText: { ...type.buttonSm, color: '#fff' },
  nudgeDismiss: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.cardBorderStrong },
  nudgeDismissText: { ...type.action, color: color.muted },

  levelBadgeDashed: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: 'rgba(200,145,47,.5)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  levelBadgeDashedText: { ...type.title, fontSize: 26, color: color.goldLight },
  emptyTitle: { ...type.titleSm, fontSize: 25, color: color.onInk, textAlign: 'center', marginBottom: space.sm },
  emptyBody: { ...type.bodyXs, color: color.onInkSoft, textAlign: 'center' },

  sectionLabel: { ...type.sectionLabel, color: color.faint, marginTop: space.xxl, marginBottom: space.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.xxl, marginBottom: space.md },
  seeAll: { ...type.action, color: color.red },

  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.card, borderWidth: 1, borderColor: color.cardBorder, borderRadius: radius.lg, padding: 15 },
  unlockNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.chip, alignItems: 'center', justifyContent: 'center' },
  unlockNumText: { ...type.rowTitle, fontSize: 13, color: color.muted },
  unlockTitle: { ...type.rowTitle, color: color.ink },
  unlockSub: { ...type.metaSm, color: color.faint },
  demoLink: { ...type.action, color: color.red },

  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelKicker: { ...type.metaSm, letterSpacing: 1, textTransform: 'uppercase', color: color.gold },
  levelName: { ...type.titleSm, color: color.onInk, marginTop: 2 },
  levelDial: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(200,145,47,.16)', borderWidth: 1.5, borderColor: 'rgba(200,145,47,.5)', alignItems: 'center', justifyContent: 'center' },
  levelDialText: { ...type.rowTitleLg, fontSize: 20, color: color.goldLight },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  levelXp: { ...type.metaSm, color: color.onInkSoft },
  track: { height: 8, backgroundColor: color.onInkTrack, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.gold, borderRadius: 99 },

  statRow: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  statKicker: { ...type.metaXs, letterSpacing: 0.8, textTransform: 'uppercase', color: color.faint },
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  statValue: { ...type.metric, color: color.ink },
  statDelta: { ...type.action },
  statSub: { ...type.metaSm, color: color.faint, marginTop: 4 },

  plusCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#fff', fontSize: 24, fontFamily: type.body.fontFamily },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.card, borderWidth: 1, borderColor: color.cardBorder, borderRadius: radius.lg, padding: 14 },
  dateAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.chip, alignItems: 'center', justifyContent: 'center' },
  dateAvatarText: { ...type.rowTitleLg, color: color.muted },
  dateName: { ...type.rowTitle, color: color.ink },
  dateMeta: { ...type.metaSm, color: color.faint },
  pill: { minWidth: 40, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center' },
  pillText: { ...type.rowTitle, fontSize: 15 },

  insightTeaser: {
    marginTop: space.lg,
    backgroundColor: color.chipAlt,
    borderWidth: 1,
    borderColor: color.cardBorder,
    borderRadius: radius.xxl,
    padding: space.xl,
  },
  insightTeaserHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  insightTeaserKickerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  insightDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.gold },
  insightTeaserKicker: { ...type.kicker, color: color.muted },
  insightTeaserChevron: { ...type.rowTitleLg, color: color.faint },
  insightTeaserBody: { ...type.quote, color: color.text },
  insightTeaserCta: { ...type.action, color: color.red, marginTop: space.sm },

  badgeTile: { flex: 1, alignItems: 'center', padding: 14 },
  badgeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  badgeTileName: { ...type.rowTitle, fontSize: 12, color: color.ink, textAlign: 'center' },
  badgeTileSub: { ...type.metaXs, color: color.faint, marginTop: 2, textAlign: 'center' },
});
