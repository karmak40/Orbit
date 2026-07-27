import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { color } from './theme';

/** Tappable 1–5 rating dots — chemistry/conversation/comfort/fun/mood scales. */
export function DotScale({
  value,
  onChange,
  color: tint = color.coral,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  color?: string;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 5, now: value }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value >= n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={t('common.ratingOf5', { label, n })}
            style={[styles.dot, { borderColor: on ? tint : color.cardBorderStrong, backgroundColor: on ? tint : 'transparent' }]}
          />
        );
      })}
    </View>
  );
}

/** Static (read-only) dot row — Date Detail's "how you rated it". */
export function DotScaleReadOnly({ value, color: tint = color.coral }: { value: number; color?: string }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={[styles.staticDot, { backgroundColor: value >= n ? tint : color.cardBorderStrong }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 11 },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5 },
  staticDot: { width: 9, height: 9, borderRadius: 5 },
});
