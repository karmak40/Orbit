import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GOALS, type GoalId, type Settings } from '../core/model';
import { isBiometricAvailable } from '../platform/biometrics';
import { setPasscode } from '../platform/passcode';
import { PrimaryButton } from './Button';
import { ArtChart, ArtDots, ArtOrbit } from './onboardingArt';
import { PasscodeSetup } from './PasscodeSetup';
import { ToggleRow } from './Toggle';
import { alpha, color, radius, space, type } from './theme';

const SLIDES = [
  { i18nKey: 'onboarding.slide1', Art: ArtOrbit },
  { i18nKey: 'onboarding.slide2', Art: ArtDots },
  { i18nKey: 'onboarding.slide3', Art: ArtChart },
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  // Starts off: toggling it on requires actually creating a passcode first (below),
  // so `privacy.lock` only ever becomes true once one genuinely exists.
  const [privacy, setPrivacy] = useState<Settings['privacy']>({ lock: false, hideNames: false, biometric: false });
  const [passcodeSetupOpen, setPasscodeSetupOpen] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [step, slide]);

  const isStory = step < 3;
  const isGoal = step === 3;
  const isPrivacy = step === 4;
  const blocked = step === 3 && !goal;
  const cta = blocked
    ? t('onboarding.pickOneToContinue')
    : step === LAST_STEP
      ? t('onboarding.startTracking')
      : t('onboarding.continue');

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

  if (passcodeSetupOpen) {
    return (
      <PasscodeSetup
        onDone={async (pin) => {
          await setPasscode(pin);
          setPrivacy((p) => ({ ...p, lock: true }));
          setPasscodeSetupOpen(false);
        }}
        onCancel={() => setPasscodeSetupOpen(false)}
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <View style={styles.dots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === step ? styles.dotActive : i < step ? styles.dotDone : null]} />
          ))}
        </View>
        <Pressable onPress={finish} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.skip}>{t('onboarding.skip')}</Text>
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
              <Text style={styles.kicker}>{t(`${slideContent.i18nKey}.kicker`)}</Text>
              <Text style={styles.storyTitle}>{t(`${slideContent.i18nKey}.title`)}</Text>
              <Text style={styles.storyBody}>{t(`${slideContent.i18nKey}.body`)}</Text>
            </View>
          ) : null}

          {isGoal ? (
            <View style={styles.stepPad}>
              <Text style={styles.kicker}>{t('onboarding.goal.kicker')}</Text>
              <Text style={styles.stepTitle}>{t('onboarding.goal.title')}</Text>
              <Text style={styles.stepSub}>{t('onboarding.goal.sub')}</Text>
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
                      <Text style={[styles.goalLabel, selected && styles.goalLabelSelected]}>
                        {t(`goal.${g.id}.label`)}
                      </Text>
                      <Text style={styles.goalSub}>{t(`goal.${g.id}.sub`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {isPrivacy ? (
            <View style={styles.stepPad}>
              <Text style={styles.kicker}>{t('onboarding.privacy.kicker')}</Text>
              <Text style={styles.stepTitle}>{t('onboarding.privacy.title')}</Text>
              <Text style={styles.stepSub}>{t('onboarding.privacy.sub')}</Text>
              <View style={styles.privacyCard}>
                <ToggleRow
                  label={t('onboarding.privacy.passcodeLock.label')}
                  sub={t('onboarding.privacy.passcodeLock.sub')}
                  value={privacy.lock}
                  onChange={(v) => {
                    if (v) setPasscodeSetupOpen(true);
                    else setPrivacy((p) => ({ ...p, lock: false, biometric: false }));
                  }}
                />
                <ToggleRow
                  label={t('onboarding.privacy.hideNames.label')}
                  sub={t('onboarding.privacy.hideNames.sub')}
                  value={privacy.hideNames}
                  onChange={(v) => setPrivacy((p) => ({ ...p, hideNames: v }))}
                />
                <ToggleRow
                  label={t('onboarding.privacy.faceId.label')}
                  sub={t('onboarding.privacy.faceId.sub')}
                  value={privacy.biometric}
                  onChange={(v) => setPrivacy((p) => ({ ...p, biometric: v }))}
                  disabled={!privacy.lock || !biometricAvailable}
                  last
                />
              </View>
              <Text style={styles.reassurance}>{t('onboarding.privacy.reassurance')}</Text>
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
