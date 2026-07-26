import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GOALS, type GoalId, type Settings } from '../core/model';
import { PrimaryButton } from './Button';
import { ArtChart, ArtDots, ArtOrbit } from './onboardingArt';
import { ToggleRow } from './Toggle';
import { alpha, color, radius, space, type } from './theme';

const SLIDES = [
  {
    kicker: 'Why bother',
    title: 'Dating is data you never write down.',
    body: 'Every date teaches you something — then it evaporates. Orbit catches it in two minutes while it is still fresh.',
    Art: ArtOrbit,
  },
  {
    kicker: 'How it works',
    title: 'Answer a few honest questions.',
    body: 'Chemistry, conversation, comfort, mood. No essays. Tap through it on the walk home and you are done.',
    Art: ArtDots,
  },
  {
    kicker: 'What you get',
    title: 'Patterns you cannot see from inside one date.',
    body: 'Levels and streaks for showing up. Then, once there is enough to read, reflections on what you keep choosing — and why.',
    Art: ArtChart,
  },
] as const;

const LAST_STEP = 4; // 0-2 story, 3 goal, 4 privacy

export type OnboardingResult = { goal: GoalId; privacy: Settings['privacy'] };

/**
 * First-launch onboarding — the design's `isIntro` flow (3 story slides → an
 * intention picker → privacy toggles). Rendered directly by `app/_layout.tsx`
 * (like `Splash`) rather than as a route, since it's a one-time gate rather
 * than a screen the user ever navigates back to.
 */
export function Onboarding({ onComplete }: { onComplete: (result: OnboardingResult) => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [privacy, setPrivacy] = useState<Settings['privacy']>({ lock: true, hideNames: false, biometric: false });
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [step, slide]);

  const isStory = step < 3;
  const isGoal = step === 3;
  const isPrivacy = step === 4;
  const blocked = step === 3 && !goal;
  const cta = blocked ? 'Pick one to continue' : step === LAST_STEP ? 'Start tracking' : 'Continue';

  function finish() {
    onComplete({ goal: goal ?? 'open', privacy });
  }
  function next() {
    if (blocked) return;
    if (step >= LAST_STEP) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  const slideStyle = {
    opacity: slide,
    transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
  const slideContent = SLIDES[Math.min(step, 2)];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <View style={styles.dots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === step ? styles.dotActive : i < step ? styles.dotDone : null]} />
          ))}
        </View>
        <Pressable onPress={finish} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Animated.View style={slideStyle}>
          {isStory ? (
            <View style={styles.storySlide}>
              <View style={styles.art}>
                <slideContent.Art />
              </View>
              <Text style={styles.kicker}>{slideContent.kicker}</Text>
              <Text style={styles.storyTitle}>{slideContent.title}</Text>
              <Text style={styles.storyBody}>{slideContent.body}</Text>
            </View>
          ) : null}

          {isGoal ? (
            <View style={styles.stepPad}>
              <Text style={styles.kicker}>One question</Text>
              <Text style={styles.stepTitle}>What are you after right now?</Text>
              <Text style={styles.stepSub}>This shapes how your score is weighted. You can change it any time.</Text>
              <View style={{ gap: 10 }}>
                {GOALS.map((g) => {
                  const selected = goal === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setGoal(g.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.goalBtn, selected && styles.goalBtnSelected]}>
                      <Text style={[styles.goalLabel, selected && styles.goalLabelSelected]}>{g.label}</Text>
                      <Text style={styles.goalSub}>{g.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {isPrivacy ? (
            <View style={styles.stepPad}>
              <Text style={styles.kicker}>Last thing</Text>
              <Text style={styles.stepTitle}>Lock it down?</Text>
              <Text style={styles.stepSub}>
                This is honest, private writing about real people. A passcode keeps it that way.
              </Text>
              <View style={styles.privacyCard}>
                <ToggleRow
                  label="Passcode lock"
                  sub="Ask for a code every time you open Orbit"
                  value={privacy.lock}
                  onChange={(v) => setPrivacy((p) => ({ ...p, lock: v }))}
                />
                <ToggleRow
                  label="Hide names"
                  sub="Show initials only in lists and widgets"
                  value={privacy.hideNames}
                  onChange={(v) => setPrivacy((p) => ({ ...p, hideNames: v }))}
                />
                <ToggleRow
                  label="Face ID"
                  sub="Unlock without typing"
                  value={privacy.biometric}
                  onChange={(v) => setPrivacy((p) => ({ ...p, biometric: v }))}
                  last
                />
              </View>
              <Text style={styles.reassurance}>Everything stays on your device. Nothing is uploaded, ever.</Text>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <PrimaryButton label={cta} onPress={next} disabled={blocked} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: 'rgba(36,31,27,.15)' },
  dotActive: { width: 20, backgroundColor: color.coral },
  dotDone: { backgroundColor: color.coral },
  skip: { ...type.action, color: color.faint },

  body: { paddingHorizontal: space.gutter, flexGrow: 1, justifyContent: 'center' },

  storySlide: { paddingVertical: 20 },
  art: { height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  kicker: { ...type.kicker, color: color.gold, marginBottom: space.md },
  storyTitle: { ...type.onboarding, color: color.ink, marginBottom: 14 },
  storyBody: { ...type.body, color: color.textSoft },

  stepPad: { paddingVertical: space.xl },
  stepTitle: { fontFamily: type.onboarding.fontFamily, fontSize: 32, lineHeight: 37, color: color.ink, marginBottom: space.sm },
  stepSub: { ...type.bodySm, color: color.muted, marginBottom: space.xxl },

  goalBtn: {
    width: '100%',
    padding: 16,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.cardBorderStrong,
    backgroundColor: color.card,
  },
  goalBtnSelected: { borderColor: color.coral, backgroundColor: alpha(color.coral, 0.07) },
  goalLabel: { ...type.rowTitleLg, color: color.ink, marginBottom: 2 },
  goalLabelSelected: { color: color.red },
  goalSub: { ...type.meta, color: color.muted, opacity: 0.85 },

  privacyCard: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.cardBorder,
    borderRadius: radius.xxl,
    paddingHorizontal: space.xl,
    marginBottom: space.lg,
  },
  reassurance: { ...type.bodyXs, color: color.faint, textAlign: 'center' },

  footer: { paddingHorizontal: space.gutter, paddingTop: space.md },
});
