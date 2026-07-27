import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ACTIVITIES,
  GREEN_FLAGS,
  QUESTION_IDS,
  RED_FLAGS,
  SEE_AGAIN,
  WHO_PAID,
  type Answer,
} from '../src/core/model';
import { grade, revealBlocker, scaleQuestions } from '../src/core/scoring';
import { LogDraft, useOrbitData } from '../src/data/store';
import { DarkButton, PrimaryButton, TextAction } from '../src/ui/Button';
import { Card, InkCard } from '../src/ui/Card';
import { Chip, Segmented } from '../src/ui/Chip';
import { DotScale } from '../src/ui/DotScale';
import { tGradeWord, tVerdictSub, tVerdictTitle, translateEnum } from '../src/ui/i18nHelpers';
import { PersonSheet, type PersonSheetInput } from '../src/ui/PersonSheet';
import { RadarChart } from '../src/ui/RadarChart';
import { ScoreRing } from '../src/ui/ScoreRing';
import { color, font, radius, scoreColor, space, type } from '../src/ui/theme';

type Mode = 'form' | 'result';
type ResultTab = 'score' | 'grade' | 'verdict' | 'radar';
const RESULT_TABS: readonly { key: ResultTab; labelKey: string }[] = [
  { key: 'score', labelKey: 'result.tabScore' },
  { key: 'grade', labelKey: 'result.tabGrade' },
  { key: 'verdict', labelKey: 'result.tabVerdict' },
  { key: 'radar', labelKey: 'result.tabRadar' },
];

export default function LogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const data = useOrbitData();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ editingId?: string }>();
  const editing = params.editingId ? data.dates.find((d) => d.id === params.editingId) ?? null : null;

  const [draft, setDraft] = useState<LogDraft>(() => {
    const fresh = data.freshLogDraft();
    if (!editing) return fresh;
    return { personId: editing.personId, activity: editing.activity, answers: { ...fresh.answers, ...editing.answers } };
  });
  const [note, setNote] = useState(editing?.note ?? '');
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('form');
  const [displayScore, setDisplayScore] = useState(0);
  const [resultTab, setResultTab] = useState<ResultTab>(data.settings.resultStyle);
  const [preview, setPreview] = useState<ReturnType<typeof data.previewProgress> | null>(null);
  const raf = useRef<number | null>(null);

  const scales = useMemo(() => scaleQuestions(data.questions), [data.questions]);
  const qEnabled = useMemo(
    () => Object.fromEntries(data.questions.map((q) => [q.id, q.enabled])),
    [data.questions]
  );

  const person = data.people.find((p) => p.id === draft.personId) ?? null;
  const canReveal = data.canRevealDraft(draft);
  const blocker = revealBlocker({ personId: draft.personId, answers: draft.answers, questions: data.questions });

  function setScale(id: string, value: number) {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: { kind: 'scale5', value } } }));
  }
  function setMood(before: number, after: number) {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [QUESTION_IDS.mood]: { kind: 'moodShift', before, after } } }));
  }
  function setChoice(id: string, value: string) {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: { kind: 'choice', value } } }));
  }
  function toggleFlag(kind: 'green' | 'red', item: string) {
    setDraft((d) => {
      const current = d.answers[QUESTION_IDS.flags];
      const flags = current?.kind === 'flagPair' ? current : { kind: 'flagPair' as const, green: [], red: [] };
      const arr = flags[kind];
      const has = arr.includes(item);
      return {
        ...d,
        answers: {
          ...d.answers,
          [QUESTION_IDS.flags]: { ...flags, [kind]: has ? arr.filter((x) => x !== item) : [...arr, item] },
        },
      };
    });
  }
  function answerOf(id: string): Answer | undefined {
    return draft.answers[id];
  }

  function reveal() {
    if (!canReveal) return;
    const p = data.previewProgress(draft, editing?.day);
    setPreview(p);
    setMode('result');
    setResultTab(data.settings.resultStyle);
    setDisplayScore(0);
    const start = performance.now();
    const dur = 950;
    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * p.score));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  async function finish() {
    await data.saveDateLog(draft, { note, day: editing?.day, editingId: editing?.id });
    router.replace(editing ? { pathname: '/date/[id]', params: { id: editing.id } } : '/');
  }

  function cancel() {
    router.back();
  }

  async function handleNewPerson(input: PersonSheetInput) {
    const p = await data.addPerson(input);
    setDraft((d) => ({ ...d, personId: p.id }));
    setPersonSheetOpen(false);
  }

  if (mode === 'result' && preview) {
    const seeAgainAnswer = answerOf(QUESTION_IDS.seeAgain);
    const seeAgain = seeAgainAnswer?.kind === 'choice' ? (seeAgainAnswer.value as 'Yes' | 'Maybe' | 'No' | null) : null;
    const title = tVerdictTitle(t, preview.score, seeAgain);
    const sub = tVerdictSub(t, preview.score, seeAgain, data.settings.verdictTone);
    const ring = scoreColor(preview.score);
    const g = grade(preview.score);
    const radarAxes: [string, number][] = [
      [t('question.chemistry.label'), numOf(draft.answers[QUESTION_IDS.chemistry])],
      [t('question.conversation.label'), numOf(draft.answers[QUESTION_IDS.conversation])],
      [t('question.comfort.label'), numOf(draft.answers[QUESTION_IDS.comfort])],
      [t('question.fun.label'), numOf(draft.answers[QUESTION_IDS.fun])],
      [t('question.mood.label'), moodAfterOf(draft.answers[QUESTION_IDS.mood])],
    ];
    const badge = preview.newBadges[0];

    return (
      <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.resultScroll}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.resultKicker}>
            {t('result.dateLogged', { name: person?.name ?? t('result.someoneNew') })}
          </Text>
          <Text style={styles.resultTitle}>{title}</Text>

          <View style={styles.tabRow}>
            {RESULT_TABS.map((rt) => (
              <Pressable
                key={rt.key}
                onPress={() => setResultTab(rt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: resultTab === rt.key }}
                style={[styles.tab, resultTab === rt.key && styles.tabActive]}>
                <Text style={[styles.tabLabel, resultTab === rt.key && styles.tabLabelActive]}>{t(rt.labelKey)}</Text>
              </Pressable>
            ))}
          </View>

          {resultTab === 'score' && <ScoreRing score={preview.score} displayScore={displayScore} ringColor={ring} />}
          {resultTab === 'grade' && (
            <View style={{ alignItems: 'center', paddingVertical: space.md }}>
              <Text style={[styles.gradeHuge, { color: ring }]}>{g}</Text>
              <Text style={styles.gradeSub}>
                {preview.score} / 100 · {tGradeWord(t, preview.score)}
              </Text>
            </View>
          )}
          {resultTab === 'verdict' && (
            <View style={{ alignItems: 'center', paddingVertical: space.sm }}>
              <View style={[styles.verdictChip, { backgroundColor: `${ring}1f` }]}>
                <Text style={[styles.verdictChipText, { color: ring }]}>{g}</Text>
              </View>
              <Text style={styles.verdictTitle}>{title}</Text>
            </View>
          )}
          {resultTab === 'radar' && <RadarChart axes={radarAxes} />}

          <Text style={styles.verdictSub}>"{sub}"</Text>

          <View style={styles.rewardRow}>
            <Card style={styles.rewardCard}>
              <Text style={[styles.rewardValue, { color: color.gold }]}>+{preview.xp}</Text>
              <Text style={styles.rewardLabel}>{t('result.xpEarned')}</Text>
            </Card>
            <Card style={styles.rewardCard}>
              <Text style={[styles.rewardValue, { color: color.red }]}>{preview.streakWeeks}</Text>
              <Text style={styles.rewardLabel}>{t('result.weekStreak')}</Text>
            </Card>
          </View>

          {badge ? (
            <InkCard style={styles.badgeCard}>
              <View style={styles.badgeGlyph}>
                <Text style={{ color: color.goldLight, fontFamily: font.serif, fontSize: 24 }}>★</Text>
              </View>
              <View>
                <Text style={styles.badgeKicker}>{t('result.badgeUnlocked')}</Text>
                <Text style={styles.badgeName}>{t(`badge.${badge.id}.name`)}</Text>
              </View>
            </InkCard>
          ) : null}

          <View style={{ marginTop: space.xl }}>
            <DarkButton label={t('result.saveToJournal')} onPress={finish} />
          </View>
          <View style={{ alignItems: 'center', marginTop: space.md }}>
            <TextAction label={t('result.done')} onPress={finish} color={color.faint} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.header}>
          <TextAction label={t('log.cancel')} onPress={cancel} color={color.faint} />
          <Text style={styles.kicker}>{editing ? t('log.editing') : t('log.newEntry')}</Text>
        </View>
        <Text style={styles.title}>{editing ? t('log.updateAnswers') : t('log.howWasIt')}</Text>
        <Text style={styles.sub}>{editing ? t('log.changeAnythingSub') : t('log.beHonestSub')}</Text>

        <Text style={styles.label}>{t('log.whoDidYouSee')}</Text>
        <View style={styles.wrap}>
          {data.people.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={draft.personId === p.id}
              onPress={() => setDraft((d) => ({ ...d, personId: p.id }))}
            />
          ))}
          <Chip label={t('log.newPersonChip')} tone="gold" selected={false} onPress={() => setPersonSheetOpen(true)} />
        </View>

        <Text style={styles.label}>{t('log.whereWhat')}</Text>
        <View style={styles.wrap}>
          {ACTIVITIES.map((a) => (
            <Chip
              key={a}
              label={translateEnum(t, 'activity', ACTIVITIES, a)}
              tone="gold"
              selected={draft.activity === a}
              onPress={() => setDraft((d) => ({ ...d, activity: a }))}
            />
          ))}
        </View>

        <Card style={{ gap: 20 }}>
          {scales.map((q) => {
            const a = answerOf(q.id);
            const value = a?.kind === 'scale5' ? a.value : 0;
            const label = t(`question.${q.id}.label`);
            return (
              <View key={q.id} style={{ gap: 11 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowHint}>{t(`question.${q.id}.hint`)}</Text>
                </View>
                <DotScale label={label} value={value} onChange={(v) => setScale(q.id, v)} />
              </View>
            );
          })}
        </Card>

        {qEnabled[QUESTION_IDS.mood] ? <MoodCard draft={draft} onChange={setMood} /> : null}

        {qEnabled[QUESTION_IDS.seeAgain] ? (
          <View style={{ marginTop: space.xl }}>
            <Text style={styles.label}>{t('log.wouldSeeAgain')}</Text>
            <Segmented
              options={SEE_AGAIN}
              renderLabel={(v) => translateEnum(t, 'seeAgainOption', SEE_AGAIN, v)}
              value={choiceOf(draft.answers[QUESTION_IDS.seeAgain])}
              onChange={(v) => setChoice(QUESTION_IDS.seeAgain, v)}
            />
          </View>
        ) : null}

        {qEnabled[QUESTION_IDS.whoPaid] ? (
          <View style={{ marginTop: space.xl }}>
            <Text style={styles.label}>{t('log.whoPaid')}</Text>
            <Segmented
              options={WHO_PAID}
              tone="gold"
              renderLabel={(v) => translateEnum(t, 'whoPaidOption', WHO_PAID, v)}
              value={choiceOf(draft.answers[QUESTION_IDS.whoPaid])}
              onChange={(v) => setChoice(QUESTION_IDS.whoPaid, v)}
            />
          </View>
        ) : null}

        {qEnabled[QUESTION_IDS.flags] ? (
          <View style={{ marginTop: space.xl }}>
            <Text style={styles.label}>{t('log.greenFlags')}</Text>
            <View style={styles.wrap}>
              {GREEN_FLAGS.map((g) => (
                <Chip
                  key={g}
                  label={translateEnum(t, 'greenFlag', GREEN_FLAGS, g)}
                  tone="green"
                  selected={flagsOf(draft.answers[QUESTION_IDS.flags]).green.includes(g)}
                  onPress={() => toggleFlag('green', g)}
                />
              ))}
            </View>
            <Text style={[styles.label, { marginTop: space.lg }]}>{t('log.redFlags')}</Text>
            <View style={styles.wrap}>
              {RED_FLAGS.map((r) => (
                <Chip
                  key={r}
                  label={translateEnum(t, 'redFlag', RED_FLAGS, r)}
                  tone="red"
                  selected={flagsOf(draft.answers[QUESTION_IDS.flags]).red.includes(r)}
                  onPress={() => toggleFlag('red', r)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Text style={[styles.label, { marginTop: space.xl }]}>{t('log.anythingElse')}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('log.notePlaceholder')}
          placeholderTextColor={color.faint}
          multiline
          style={styles.noteInput}
        />
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: insets.bottom + space.lg }]}>
        <PrimaryButton
          label={canReveal ? t('log.revealResult') : blocker === 'person' ? t('log.pickWhoYouSaw') : t('log.rateFirstTwo')}
          onPress={reveal}
          disabled={!canReveal}
        />
      </View>

      <PersonSheet visible={personSheetOpen} onCancel={() => setPersonSheetOpen(false)} onSave={handleNewPerson} />
    </View>
  );
}

function MoodCard({ draft, onChange }: { draft: LogDraft; onChange: (before: number, after: number) => void }) {
  const { t } = useTranslation();
  const mood = draft.answers[QUESTION_IDS.mood];
  const before = mood?.kind === 'moodShift' ? mood.before : 0;
  const after = mood?.kind === 'moodShift' ? mood.after : 0;
  return (
    <Card style={{ gap: 18, marginTop: space.xl }}>
      <Text style={styles.rowLabel}>{t('log.moodShift')}</Text>
      <View style={{ gap: 11 }}>
        <Text style={styles.moodLabel}>{t('log.beforeTheDate')}</Text>
        <DotScale label={t('log.beforeTheDate')} value={before} onChange={(v) => onChange(v, after)} />
      </View>
      <View style={{ gap: 11 }}>
        <Text style={styles.moodLabel}>{t('log.afterTheDate')}</Text>
        <DotScale label={t('log.afterTheDate')} value={after} onChange={(v) => onChange(before, v)} />
      </View>
    </Card>
  );
}

function choiceOf(a: Answer | undefined): string | null {
  return a?.kind === 'choice' ? a.value : null;
}
function flagsOf(a: Answer | undefined): { green: string[]; red: string[] } {
  return a?.kind === 'flagPair' ? a : { green: [], red: [] };
}
function numOf(a: Answer | undefined): number {
  return a?.kind === 'scale5' ? a.value : 0;
}
function moodAfterOf(a: Answer | undefined): number {
  return a?.kind === 'moodShift' ? a.after : 0;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  formScroll: { paddingHorizontal: space.gutter, flexGrow: 1 },
  resultScroll: { paddingHorizontal: space.gutter, alignItems: 'center', flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  kicker: { ...type.sectionLabel, color: color.gold },
  title: { ...type.title, color: color.ink, marginBottom: 2 },
  sub: { ...type.meta, color: color.faint, marginBottom: space.xl },
  label: { ...type.label, color: color.ink, marginBottom: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.xl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { ...type.label, color: color.ink },
  rowHint: { ...type.meta, color: color.faint },
  moodLabel: { ...type.bodySm, color: color.muted },
  noteInput: {
    minHeight: 80,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.cardBorderStrong,
    borderRadius: radius.md,
    padding: 14,
    ...type.bodyXs,
    color: color.ink,
    textAlignVertical: 'top',
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.gutter,
    paddingTop: space.lg,
  },
  resultKicker: { ...type.kicker, color: color.gold, marginTop: space.md, marginBottom: space.sm },
  resultTitle: { ...type.titleSm, color: color.ink, marginBottom: space.xl, textAlign: 'center' },
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
  rewardRow: { flexDirection: 'row', gap: space.md, width: '100%', marginTop: space.xxl, marginBottom: space.sm },
  rewardCard: { flex: 1, alignItems: 'flex-start' },
  rewardValue: { ...type.titleSm, fontSize: 30, lineHeight: 35 },
  rewardLabel: { ...type.metaXs, color: color.faint, letterSpacing: 0.6, marginTop: 3 },
  badgeCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, width: '100%', marginTop: space.md },
  badgeGlyph: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(200,145,47,.2)', alignItems: 'center', justifyContent: 'center' },
  badgeKicker: { ...type.metaXs, letterSpacing: 1, color: color.gold, textTransform: 'uppercase' },
  badgeName: { ...type.titleSm, fontSize: 19, color: color.onInk, marginTop: 2 },
});
