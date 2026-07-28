import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QUESTION_IDS } from '../../../src/core/model';
import { grade, moodValue, scaleValue, seeAgainValue } from '../../../src/core/scoring';
import { useOrbitData } from '../../../src/data/store';
import { BackButton } from '../../../src/ui/BackButton';
import { tGradeWord, tVerdictSub, tVerdictTitle } from '../../../src/ui/i18nHelpers';
import { ResultTabs, type ResultTab } from '../../../src/ui/ResultTabs';
import { color, scoreColor, space, type } from '../../../src/ui/theme';

/**
 * Read-only view of the four result presentations (Score/Grade/Verdict/Radar)
 * for an already-logged date — the only place they were previously visible
 * was the fresh reveal right after logging or editing (`app/log.tsx`'s
 * `'result'` mode). Reuses `ResultTabs`, the same component that flow renders,
 * but with the actual saved score instead of a `previewProgress` computation
 * (which would incorrectly recompute XP/streak/badges as if this were a new
 * date) and no count-up animation or save button — there's nothing to save.
 */
export default function DateResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useOrbitData();
  const { t } = useTranslation();
  const [tab, setTab] = useState<ResultTab>(data.settings.resultStyle);

  const d = data.dates.find((x) => x.id === id);
  if (!d) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.md }]}>
        <BackButton label={t('dateDetail.back')} onPress={() => router.back()} />
        <Text style={styles.notFound}>{t('dateDetail.notFound')}</Text>
      </View>
    );
  }

  const seeAgain = seeAgainValue(d.answers);
  const title = tVerdictTitle(t, d.score, seeAgain);
  const sub = tVerdictSub(t, d.score, seeAgain, data.settings.verdictTone);
  const ring = scoreColor(d.score);
  const radarAxes: [string, number][] = [
    [t('question.chemistry.label'), scaleValue(d.answers, QUESTION_IDS.chemistry)],
    [t('question.conversation.label'), scaleValue(d.answers, QUESTION_IDS.conversation)],
    [t('question.comfort.label'), scaleValue(d.answers, QUESTION_IDS.comfort)],
    [t('question.fun.label'), scaleValue(d.answers, QUESTION_IDS.fun)],
    [t('question.mood.label'), moodValue(d.answers)?.after ?? 0],
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }]}>
      <View style={styles.header}>
        <BackButton label={t('dateDetail.back')} onPress={() => router.back()} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{t('result.dateLogged', { name: d.personName })}</Text>
        <Text style={styles.title}>{title}</Text>

        <ResultTabs
          tab={tab}
          onTabChange={setTab}
          score={d.score}
          displayScore={d.score}
          ringColor={ring}
          gradeLetter={grade(d.score)}
          gradeWord={tGradeWord(t, d.score)}
          verdictTitle={title}
          verdictSub={sub}
          radarAxes={radarAxes}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  header: { paddingHorizontal: space.gutter },
  scroll: { paddingHorizontal: space.gutter, alignItems: 'center', flexGrow: 1 },
  notFound: { ...type.body, color: color.muted, marginTop: space.xl, paddingHorizontal: space.gutter },
  kicker: { ...type.kicker, color: color.gold, marginTop: space.lg, marginBottom: space.sm },
  title: { ...type.titleSm, color: color.ink, marginBottom: space.xl, textAlign: 'center' },
});
