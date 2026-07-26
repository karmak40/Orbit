import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BADGES } from '../../src/core/progress';
import { dayLabel } from '../../src/core/selectors';
import { useOrbitData } from '../../src/data/store';
import { PrimaryButton } from '../../src/ui/Button';
import { Card, InkCard } from '../../src/ui/Card';
import { PersonSheet, type PersonSheetInput } from '../../src/ui/PersonSheet';
import { Screen } from '../../src/ui/Screen';
import { alpha, color, radius, scoreColor, space, type } from '../../src/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const data = useOrbitData();
  const [personSheetOpen, setPersonSheetOpen] = useState(false);

  if (!data.ready) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  const dateHeading = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const greeting = data.settings.userName ? `Hey, ${data.settings.userName}` : 'Hey there';
  const initial = (data.settings.userName.trim()[0] || 'R').toUpperCase();

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateLabel}>{dateHeading}</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      {data.nudgeVisible && data.dates.length > 0 ? (
        <Card style={styles.nudge}>
          <Text style={styles.nudgeTitle}>Last night with {data.dates[0].personName}?</Text>
          <Text style={styles.nudgeBody}>
            Log it now — memory fades fast, and honest notes are the whole point.
          </Text>
          <View style={styles.nudgeButtons}>
            <Pressable onPress={() => router.push('/log')} accessibilityRole="button" style={styles.nudgeCta}>
              <Text style={styles.nudgeCtaText}>Log it</Text>
            </Pressable>
            <Pressable onPress={data.dismissNudge} accessibilityRole="button" style={styles.nudgeDismiss}>
              <Text style={styles.nudgeDismissText}>Not tonight</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      {!data.hasData ? (
        <EmptyHome onLog={() => router.push('/log')} onDemo={data.fillDemo} />
      ) : (
        <PopulatedHome onNewPerson={() => setPersonSheetOpen(true)} />
      )}

      <PersonSheet
        visible={personSheetOpen}
        onCancel={() => setPersonSheetOpen(false)}
        onSave={async (input: PersonSheetInput) => {
          await data.addPerson(input);
          setPersonSheetOpen(false);
        }}
      />
    </Screen>
  );
}

const UNLOCK_STEPS = [
  { n: '1', title: 'Your first result', sub: 'A score and a read on how it went' },
  { n: '3', title: 'Streaks and badges', sub: 'Credit for putting yourself out there' },
  { n: '5', title: 'Patterns and AI reflections', sub: 'What you keep choosing, and why' },
];

function EmptyHome({ onLog, onDemo }: { onLog: () => void; onDemo: () => void }) {
  return (
    <View>
      <InkCard style={{ alignItems: 'center', marginBottom: space.lg }}>
        <View style={styles.levelBadgeDashed}>
          <Text style={styles.levelBadgeDashedText}>1</Text>
        </View>
        <Text style={styles.emptyTitle}>Level 1 starts with one date</Text>
        <Text style={styles.emptyBody}>
          Log your first one and Orbit starts building your picture. Three dates in, patterns appear.
        </Text>
      </InkCard>
      <PrimaryButton label="Log your first date" onPress={onLog} />

      <Text style={styles.sectionLabel}>What unlocks as you go</Text>
      <View style={{ gap: space.sm }}>
        {UNLOCK_STEPS.map((s) => (
          <View key={s.n} style={styles.unlockRow}>
            <View style={styles.unlockNum}>
              <Text style={styles.unlockNumText}>{s.n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>{s.title}</Text>
              <Text style={styles.unlockSub}>{s.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable onPress={onDemo} accessibilityRole="button" style={{ marginTop: space.xl, alignItems: 'center' }}>
        <Text style={styles.demoLink}>Preview with sample data</Text>
      </Pressable>
    </View>
  );
}

function PopulatedHome({ onNewPerson }: { onNewPerson: () => void }) {
  const router = useRouter();
  const data = useOrbitData();

  const earned = new Set(data.earnedBadgeIds);
  const recentBadges = BADGES.slice(0, 3);

  // "Dating Score" — an unresolved gap in the source design (docs/01-analysis.md §7.2):
  // shown but never defined there. Simplest honest reading: mean of all logged scores.
  const datingScore = data.dates.length
    ? Math.round(data.dates.reduce((s, d) => s + d.score, 0) / data.dates.length)
    : 0;
  const trendUp = data.dates.length > 1 && data.dates[0].score >= data.dates[1].score;

  return (
    <View>
      <InkCard style={{ marginBottom: space.md }}>
        <View style={styles.levelRow}>
          <View>
            <Text style={styles.levelKicker}>Level {data.level.level}</Text>
            <Text style={styles.levelName}>{data.level.name}</Text>
          </View>
          <View style={styles.levelDial}>
            <Text style={styles.levelDialText}>{data.level.level}</Text>
          </View>
        </View>
        <View style={{ marginTop: space.lg }}>
          <View style={styles.rowBetween}>
            <Text style={styles.levelXp}>{data.xp} XP</Text>
            <Text style={styles.levelXp}>{data.level.nextXp ? `${data.level.nextXp} XP to Level ${data.level.level + 1}` : 'Max level'}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(data.level.fill * 100)}%` }]} />
          </View>
        </View>
      </InkCard>

      <View style={styles.statRow}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statKicker}>Dating Score</Text>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValue}>{datingScore}</Text>
            <Text style={[styles.statDelta, { color: trendUp ? color.olive : color.faint }]}>{trendUp ? '▲' : '—'}</Text>
          </View>
          <Text style={styles.statSub}>{data.dates.length} date{data.dates.length === 1 ? '' : 's'} logged</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statKicker}>Streak</Text>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValue}>{data.streakWeeks}</Text>
            <Text style={[styles.statDelta, { color: color.red }]}>weeks</Text>
          </View>
          <Text style={styles.statSub}>{data.streakWeeks > 0 ? 'Active & putting yourself out there' : 'Log this week to start one'}</Text>
        </Card>
      </View>

      <View style={{ marginTop: space.lg }}>
        <PrimaryButton
          label="Log a date"
          sub="Just got back? Capture it while it's fresh"
          onPress={() => router.push('/log')}
          trailing={
            <View style={styles.plusCircle}>
              <Text style={styles.plusText}>+</Text>
            </View>
          }
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Recent dates</Text>
        <Pressable onPress={() => router.push('/timeline')} accessibilityRole="button">
          <Text style={styles.seeAll}>See all</Text>
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
              <Text style={styles.dateMeta}>{d.activity} · {dayLabel(d.day)}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: alpha(scoreColor(d.score), 0.12) }]}>
              <Text style={[styles.pillText, { color: scoreColor(d.score) }]}>{d.score}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={onNewPerson} accessibilityRole="button" style={styles.addPersonRow}>
        <Text style={styles.addPersonText}>+ Add someone new</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Badges</Text>
        <Pressable onPress={() => router.push('/awards')} accessibilityRole="button">
          <Text style={styles.seeAll}>See all</Text>
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
              <Text style={styles.badgeTileName}>{b.name}</Text>
              <Text style={styles.badgeTileSub}>{got ? b.sub : 'Locked'}</Text>
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

  addPersonRow: { marginTop: space.md, borderWidth: 1.5, borderColor: color.cardBorderDashed, borderStyle: 'dashed', borderRadius: radius.lg, padding: 14, alignItems: 'center' },
  addPersonText: { ...type.buttonSm, color: color.muted },

  badgeTile: { flex: 1, alignItems: 'center', padding: 14 },
  badgeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  badgeTileName: { ...type.rowTitle, fontSize: 12, color: color.ink, textAlign: 'center' },
  badgeTileSub: { ...type.metaXs, color: color.faint, marginTop: 2, textAlign: 'center' },
});
