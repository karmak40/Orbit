import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { color, font } from './theme';

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

function FaceIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.faint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2" />
      <Circle cx={9} cy={11} r={1} fill={color.faint} stroke="none" />
      <Circle cx={15} cy={11} r={1} fill={color.faint} stroke="none" />
      <Path d="M9 15c.8.7 1.9 1 3 1s2.2-.3 3-1" />
    </Svg>
  );
}

function DeleteIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.faint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-6-6 6-6Z" />
      <Path d="M13 10l4 4M17 10l-4 4" />
    </Svg>
  );
}

export type PinKeypadProps = {
  /** Digits entered so far (0–`max`). */
  filled: number;
  max?: number;
  /** Flashes the dots red and shakes — a wrong code or a mismatch. */
  error?: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Omit to hide the Face ID key entirely (e.g. during passcode creation). */
  onBiometric?: () => void;
};

/** The design's dark PIN entry (design/Dating Tracker.dc.html:122-135) — 4 dots, a 3×4 numeric grid with Face ID and delete in the corners. Shared by `Lock` (unlock) and `PasscodeSetup` (create/confirm). */
export function PinKeypad({ filled, max = 4, error, onDigit, onDelete, onBiometric }: PinKeypadProps) {
  return (
    <View style={styles.root}>
      <View style={styles.dots}>
        {Array.from({ length: max }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < filled && (error ? styles.dotError : styles.dotFilled),
            ]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {DIGIT_ROWS.map((row) => (
          <View key={row.join('')} style={styles.row}>
            {row.map((d) => (
              <Pressable key={d} onPress={() => onDigit(d)} accessibilityRole="button" style={styles.key}>
                <Text style={styles.keyLabel}>{d}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={styles.row}>
          <Pressable
            onPress={onBiometric}
            disabled={!onBiometric}
            accessibilityRole="button"
            style={[styles.key, styles.keyGhost]}>
            {onBiometric ? <FaceIcon /> : null}
          </Pressable>
          <Pressable onPress={() => onDigit('0')} accessibilityRole="button" style={styles.key}>
            <Text style={styles.keyLabel}>0</Text>
          </Pressable>
          <Pressable onPress={onDelete} accessibilityRole="button" style={[styles.key, styles.keyGhost]}>
            <DeleteIcon />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const KEY_SIZE = 62;

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(242,236,227,.35)',
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: color.goldLight, borderColor: color.goldLight },
  dotError: { backgroundColor: color.coral, borderColor: color.coral },
  grid: { gap: 18 },
  row: { flexDirection: 'row', gap: 22 },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: 'rgba(242,236,227,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyLabel: { fontFamily: font.serif, fontSize: 26, color: color.onInk },
});
