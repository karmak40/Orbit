import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from './theme';

/**
 * Temporary marker for a screen that is scaffolded but not yet built.
 * Every use of this is a tracked gap — delete as each screen lands.
 */
export function Placeholder({ title, sub, next }: { title: string; sub: string; next: string }) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
      <View style={styles.card}>
        <Text style={styles.kicker}>Not built yet</Text>
        <Text style={styles.next}>{next}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.ink, marginBottom: space.xs },
  sub: { ...type.meta, color: color.faint, marginBottom: space.xxl },
  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.cardBorderDashed,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    padding: space.xl,
  },
  kicker: { ...type.kicker, color: color.gold, marginBottom: space.sm },
  next: { ...type.bodySm, color: color.textSoft },
});
