import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, shadow, space, type } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  sub?: string;
  trailing?: ReactNode;
};

/** The coral full-width primary CTA ("Log a date", "Reveal my result"). */
export function PrimaryButton({ label, onPress, disabled, sub, trailing }: ButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.primary, disabled && styles.primaryDisabled]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.primaryLabel}>{label}</Text>
        {sub ? <Text style={styles.primarySub}>{sub}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

/** The near-black secondary CTA ("Edit answers", "Lock now"). */
export function DarkButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      style={[styles.dark, disabled && styles.primaryDisabled]}>
      <Text style={styles.darkLabel}>{label}</Text>
    </Pressable>
  );
}

/** Outlined ghost button ("Keep it", "Cancel", "Export my data"). */
export function GhostButton({ label, onPress, tone = 'neutral' }: ButtonProps & { tone?: 'neutral' | 'danger' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.ghost}>
      <Text style={[styles.ghostLabel, tone === 'danger' && { color: color.red }]}>{label}</Text>
    </Pressable>
  );
}

/** Plain text link-style action ("See all", "Back", "Cancel"). */
export function TextAction({
  label,
  onPress,
  color: c = color.red,
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      <Text style={[styles.textAction, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    width: '100%',
    backgroundColor: color.coral,
    borderRadius: radius.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.coral,
  },
  primaryDisabled: { backgroundColor: color.disabled, boxShadow: 'none' },
  primaryLabel: { ...type.button, color: '#fff' },
  primarySub: { ...type.metaSm, color: 'rgba(255,255,255,.8)', marginTop: 2 },
  dark: {
    width: '100%',
    backgroundColor: color.ink,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
  },
  darkLabel: { ...type.buttonSm, color: color.onInk },
  ghost: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: color.cardBorderStrong,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
  },
  ghostLabel: { ...type.buttonSm, color: color.textMuted },
  textAction: { ...type.action },
});
