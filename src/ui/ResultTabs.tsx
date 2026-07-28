import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RadarChart } from './RadarChart';
import { ScoreRing } from './ScoreRing';
import { color, radius, space, type } from './theme';

export type ResultTab = 'score' | 'grade' | 'verdict' | 'radar';

const RESULT_TABS: readonly { key: ResultTab; labelKey: string }[] = [
  { key: 'score', labelKey: 'result.tabScore' },
  { key: 'grade', labelKey: 'result.tabGrade' },
  { key: 'verdict', labelKey: 'result.tabVerdict' },
  { key: 'radar', labelKey: 'result.tabRadar' },
];

export type ResultTabsProps = {
  tab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  /** Final score — used for the grade/verdict tabs and the ring's target angle. */
  score: number;
  /** What the ring/number currently shows — animate this separately for a count-up reveal, or pass `score` for a static view. */
  displayScore: number;
  ringColor: string;
  gradeLetter: string;
  gradeWord: string;
  verdictTitle: string;
  verdictSub: string;
  radarAxes: readonly [string, number][];
};

/**
 * The four result presentations (design's `defaultResultStyle` knob — score
 * ring, letter grade, verdict card, radar chart) plus their shared tab
 * switcher and the italic verdict caption underneath. Shared by the log
 * flow's fresh reveal (`app/log.tsx`) and the read-only "view result" screen
 * for an already-logged date (`app/date/[id]/result.tsx`) — both need
 * identical tab behaviour, only what surrounds them (a count-up + save vs. a
 * static score + a back button) differs.
 */
export function ResultTabs({
  tab,
  onTabChange,
  score,
  displayScore,
  ringColor,
  gradeLetter,
  gradeWord,
  verdictTitle,
  verdictSub,
  radarAxes,
}: ResultTabsProps) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.tabRow}>
        {RESULT_TABS.map((rt) => (
          <Pressable
            key={rt.key}
            onPress={() => onTabChange(rt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === rt.key }}
            style={[styles.tab, tab === rt.key && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === rt.key && styles.tabLabelActive]}>{t(rt.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'score' && <ScoreRing score={score} displayScore={displayScore} ringColor={ringColor} />}
      {tab === 'grade' && (
        <View style={{ alignItems: 'center', paddingVertical: space.md }}>
          <Text style={[styles.gradeHuge, { color: ringColor }]}>{gradeLetter}</Text>
          <Text style={styles.gradeSub}>
            {score} / 100 · {gradeWord}
          </Text>
        </View>
      )}
      {tab === 'verdict' && (
        <View style={{ alignItems: 'center', paddingVertical: space.sm }}>
          <View style={[styles.verdictChip, { backgroundColor: `${ringColor}1f` }]}>
            <Text style={[styles.verdictChipText, { color: ringColor }]}>{gradeLetter}</Text>
          </View>
          <Text style={styles.verdictTitle}>{verdictTitle}</Text>
        </View>
      )}
      {tab === 'radar' && <RadarChart axes={radarAxes} />}

      <Text style={styles.verdictSub}>"{verdictSub}"</Text>
    </>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 6, backgroundColor: color.chipAlt, borderRadius: 14, padding: 4, marginBottom: space.xl },
  tab: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: color.card },
  tabLabel: { ...type.metaSm, color: color.muted },
  tabLabelActive: { color: color.ink },
  gradeHuge: { ...type.gradeHuge },
  gradeSub: { ...type.meta, color: color.faint },
  verdictChip: { width: 80, height: 80, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  verdictChipText: { ...type.titleSm, fontSize: 40, lineHeight: 46 },
  verdictTitle: { ...type.title, color: color.ink, textAlign: 'center', maxWidth: 280 },
  verdictSub: { ...type.body, color: color.textSoft, fontStyle: 'italic', textAlign: 'center', marginTop: space.lg, maxWidth: 270 },
});
