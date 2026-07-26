import { StyleSheet, Text, View } from 'react-native';

import { BADGES, LEVELS } from '../../src/core/progress';
import { useOrbitData } from '../../src/data/store';
import { Card, InkCard } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { alpha, color, radius, space, type } from '../../src/ui/theme';

export default function AwardsScreen() {
  const data = useOrbitData();
  const earned = new Set(data.earnedBadgeIds);
  const badgeCount = `${earned.size} of ${BADGES.length}`;

  return (
    <Screen>
      <Text style={styles.title}>Awards</Text>
      <Text style={styles.sub}>Progress you've earned by showing up</Text>

      <InkCard style={{ marginBottom: space.xxl }}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelBig}>Level {data.level.level}</Text>
          <Text style={styles.levelXp}>{data.xp} / {data.level.nextXp ?? data.xp} XP</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(data.level.fill * 100)}%` }]} />
        </View>
        <View style={{ gap: 14 }}>
          {LEVELS.map((l) => {
            const done = l.level < data.level.level;
            const current = l.level === data.level.level;
            const locked = l.level > data.level.level;
            return (
              <View key={l.level} style={[styles.levelRow, locked && { opacity: 0.4 }]}>
                <View
                  style={[
                    styles.levelDot,
                    {
                      borderColor: current ? color.goldLight : done ? 'rgba(200,145,47,.45)' : 'rgba(242,236,227,.22)',
                      backgroundColor: current ? 'rgba(200,145,47,.22)' : 'transparent',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.levelDotText,
                      { color: current ? color.goldLight : done ? 'rgba(224,178,90,.8)' : 'rgba(242,236,227,.45)' },
                    ]}>
                    {l.level}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.levelName}>{l.name}</Text>
                  <Text style={styles.levelReq}>{l.req}</Text>
                </View>
                <Text style={[styles.levelTag, { color: current ? color.goldLight : 'rgba(242,236,227,.4)' }]}>
                  {current ? 'YOU' : done ? '✓' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </InkCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Badge collection</Text>
        <Text style={styles.sectionCount}>{badgeCount}</Text>
      </View>
      <View style={styles.badgeGrid}>
        {BADGES.map((b) => {
          const got = earned.has(b.id);
          return (
            <Card key={b.id} style={[styles.badgeTile, { opacity: got ? 1 : 0.45 }]}>
              <View style={[styles.badgeIcon, { backgroundColor: alpha(b.color, got ? 0.15 : 0.08) }]}>
                <Text style={{ color: got ? b.color : color.fainter, fontSize: 16 }}>★</Text>
              </View>
              <Text style={styles.badgeName}>{b.name}</Text>
              <Text style={styles.badgeSub}>{got ? b.sub : 'Locked'}</Text>
            </Card>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Streak · last 12 weeks</Text>
      <Card style={{ marginBottom: space.xxl }}>
        <View style={styles.weekRow}>
          {data.weeklyIntensity.map((w, i) => (
            <View
              key={i}
              style={[
                styles.weekCell,
                {
                  backgroundColor: w === 0 ? 'rgba(36,31,27,.05)' : w === 1 ? 'rgba(216,90,74,.35)' : color.coral,
                  borderColor: w === 0 ? color.cardBorder : 'transparent',
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.weekLabels}>
          <Text style={styles.weekLabelText}>12 weeks ago</Text>
          <Text style={styles.weekLabelText}>This week</Text>
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Friends</Text>
      <View style={styles.friendsCard}>
        <Text style={styles.friendsTitle}>Compare progress with friends</Text>
        <Text style={styles.friendsBody}>
          Share only your level and streak — never who you dated or how you rated them. Coming once sync is available.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.ink, marginBottom: 4 },
  sub: { ...type.meta, color: color.faint, marginBottom: space.xl },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.lg },
  levelBig: { ...type.title, fontSize: 24, lineHeight: 28, color: color.onInk },
  levelXp: { ...type.metaSm, color: color.onInkSoft },
  track: { height: 8, backgroundColor: color.onInkTrack, borderRadius: 99, overflow: 'hidden', marginBottom: space.xl },
  fill: { height: '100%', backgroundColor: color.gold, borderRadius: 99 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  levelDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  levelDotText: { ...type.rowTitle, fontSize: 14 },
  levelName: { ...type.rowTitle, color: color.onInk },
  levelReq: { ...type.metaXs, color: 'rgba(242,236,227,.5)' },
  levelTag: { ...type.metaXs, fontFamily: type.rowTitle.fontFamily },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md },
  sectionLabel: { ...type.sectionLabel, color: color.faint, marginBottom: space.md },
  sectionCount: { ...type.action, color: color.faint },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xxl },
  badgeTile: { width: '31%', alignItems: 'center', padding: 12 },
  badgeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  badgeName: { ...type.rowTitle, fontSize: 11, color: color.ink, textAlign: 'center' },
  badgeSub: { ...type.metaXs, color: color.faint, marginTop: 2, textAlign: 'center' },

  weekRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', marginBottom: space.md },
  weekCell: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1 },
  weekLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  weekLabelText: { ...type.metaSm, color: color.faint },

  friendsCard: { backgroundColor: color.card, borderWidth: 1, borderColor: color.cardBorderDashed, borderStyle: 'dashed', borderRadius: radius.xl, padding: space.xl, alignItems: 'center' },
  friendsTitle: { ...type.quote, fontSize: 18, color: color.text, marginBottom: space.sm, textAlign: 'center' },
  friendsBody: { ...type.bodySm, color: color.faint, textAlign: 'center' },
});
