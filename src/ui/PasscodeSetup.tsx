import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinKeypad } from './PinKeypad';
import { color, space, type } from './theme';

type Stage = 'create' | 'confirm';

export type PasscodeSetupProps = {
  onDone: (pin: string) => void;
  onCancel: () => void;
};

/**
 * Two-step "create, then confirm" passcode capture — used both inline from
 * Onboarding's privacy step and inside a Modal from Settings. Not part of the
 * original design (its privacy step was a bare toggle with no real PIN
 * capture); styled to match `Lock`'s dark keypad screen since it's the same
 * kind of security-sensitive moment.
 */
export function PasscodeSetup({ onDone, onCancel }: PasscodeSetupProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function digit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setError(false);
    setPin(next);
    if (next.length < 4) return;

    if (stage === 'create') {
      setTimeout(() => {
        setFirstPin(next);
        setPin('');
        setStage('confirm');
      }, 200);
      return;
    }

    // confirm stage
    if (next === firstPin) {
      setTimeout(() => onDone(next), 200);
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setFirstPin('');
        setStage('create');
        setError(false);
      }, 700);
    }
  }

  function del() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
      <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={10} style={styles.cancel}>
        <Text style={styles.cancelLabel}>{t('passcodeSetup.cancel')}</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.title}>
          {stage === 'create' ? t('passcodeSetup.createTitle') : t('passcodeSetup.confirmTitle')}
        </Text>
        <Text style={styles.sub}>{error ? t('passcodeSetup.mismatch') : stage === 'create' ? t('passcodeSetup.createSub') : t('passcodeSetup.confirmSub')}</Text>

        <View style={{ marginTop: 30 }}>
          <PinKeypad filled={pin.length} error={error} onDigit={digit} onDelete={del} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241f1b', paddingHorizontal: space.gutter },
  cancel: { alignSelf: 'flex-start' },
  cancelLabel: { ...type.action, color: color.faint },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: type.title.fontFamily, fontSize: 26, lineHeight: 31, color: color.onInk, marginBottom: 6 },
  sub: { ...type.metaSm, color: color.faint, textAlign: 'center' },
});
