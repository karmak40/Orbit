import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authenticateWithBiometrics } from '../platform/biometrics';
import { verifyPasscode } from '../platform/passcode';
import { ConfirmSheet } from './ConfirmSheet';
import { PinKeypad } from './PinKeypad';
import { color, space, type } from './theme';

export type LockProps = {
  biometricEnabled: boolean;
  onUnlock: () => void;
  /** No account, nothing to verify identity against — recovery is an honest "turn the lock off", not a real reset. */
  onForgotPasscode: () => void;
};

/**
 * The design's "Welcome back" PIN screen (design/Dating Tracker.dc.html:122-135),
 * rendered directly by `app/_layout.tsx` — like `Splash`/`Onboarding` it's a
 * one-time gate, not a route. Tries Face ID automatically on mount when
 * enabled; the keypad underneath is always the fallback, never a dead end.
 */
export function Lock({ biometricEnabled, onUnlock, onForgotPasscode }: LockProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const triedBiometricRef = useRef(false);

  async function tryBiometric() {
    const ok = await authenticateWithBiometrics(t('lock.hintWithBiometric'));
    if (ok) onUnlock();
  }

  useEffect(() => {
    if (biometricEnabled && !triedBiometricRef.current) {
      triedBiometricRef.current = true;
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricEnabled]);

  async function digit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setError(false);
    setPin(next);
    if (next.length < 4) return;

    const ok = await verifyPasscode(next);
    if (ok) {
      setTimeout(onUnlock, 200);
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  }

  function del() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 90 }]}>
      <LinearGradient colors={['#d85a4a', '#c8912f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.glyph} />
      <Text style={styles.title}>{t('lock.welcomeBack')}</Text>
      <Text style={styles.hint}>{error ? t('lock.wrongCode') : biometricEnabled ? t('lock.hintWithBiometric') : t('lock.hintCodeOnly')}</Text>

      <View style={{ marginTop: 30 }}>
        <PinKeypad
          filled={pin.length}
          error={error}
          onDigit={digit}
          onDelete={del}
          onBiometric={biometricEnabled ? tryBiometric : undefined}
        />
      </View>

      <Pressable onPress={() => setForgotOpen(true)} accessibilityRole="button" hitSlop={10} style={styles.forgot}>
        <Text style={styles.forgotLabel}>{t('lock.forgotCode')}</Text>
      </Pressable>

      <ConfirmSheet
        visible={forgotOpen}
        title={t('lock.forgotConfirm.title')}
        body={t('lock.forgotConfirm.body')}
        cta={t('lock.forgotConfirm.cta')}
        onConfirm={() => {
          setForgotOpen(false);
          onForgotPasscode();
        }}
        onCancel={() => setForgotOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#241f1b',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingBottom: space.xxl,
  },
  glyph: { width: 46, height: 46, borderRadius: 23, marginBottom: 22 },
  title: { ...type.title, fontSize: 26, lineHeight: 31, color: color.onInk, marginBottom: 6 },
  hint: { ...type.metaSm, color: color.faint },
  forgot: { marginTop: 'auto', paddingTop: space.xxl, paddingHorizontal: space.md, paddingVertical: space.sm },
  forgotLabel: { ...type.action, color: color.faint },
});
