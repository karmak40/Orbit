import { Pressable, StyleSheet, Text, View } from 'react-native';

import { alpha, color, radius, type } from './theme';

export type ChipTone = 'coral' | 'gold' | 'green' | 'red';

const TONE_COLOR: Record<ChipTone, string> = {
  coral: color.coral,
  gold: color.gold,
  green: color.olive,
  red: color.red,
};

/** Pill selector chip — person/activity/source pickers, green/red flag tags. */
export function Chip({
  label,
  selected,
  onPress,
  tone = 'coral',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: ChipTone;
}) {
  const c = TONE_COLOR[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: selected ? c : color.cardBorderStrong, backgroundColor: selected ? alpha(c, 0.1) : 'transparent' },
      ]}>
      <Text style={[styles.label, { color: selected ? c : color.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

/** Two/three-way segmented control — see-again, who-paid. */
export function Segmented({
  options,
  value,
  onChange,
  tone = 'coral',
  renderLabel = (opt) => opt,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
  tone?: ChipTone;
  /** Translates an option's stored (English) value for display. Defaults to identity. */
  renderLabel?: (opt: string) => string;
}) {
  const c = TONE_COLOR[tone];
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              { borderColor: selected ? c : color.cardBorder, backgroundColor: selected ? alpha(c, 0.1) : 'transparent' },
            ]}>
            <Text style={[styles.segLabel, { color: selected ? c : color.textMuted }]}>{renderLabel(opt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  label: { ...type.action, fontFamily: type.action.fontFamily },
  row: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center' },
  segLabel: { ...type.label },
});
