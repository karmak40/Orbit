import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayLabel } from '../../src/core/selectors';
import { useOrbitData } from '../../src/data/store';
import { Screen } from '../../src/ui/Screen';
import { alpha, color, radius, scoreColor, space, type } from '../../src/ui/theme';

export default function TimelineScreen() {
  const router = useRouter();
  const data = useOrbitData();

  return (
    <Screen>
      <Text style={styles.title}>Timeline</Text>
      <Text style={styles.sub}>Every date, in order</Text>

      {data.history.length === 0 ? (
        <Text style={styles.empty}>Nothing logged yet — your first date will start the timeline.</Text>
      ) : (
        data.history.map((group) => (
          <View key={group.month} style={{ marginBottom: space.xxl }}>
            <Text style={styles.monthLabel}>{group.month}</Text>
            <View style={styles.rail}>
              {group.items.map((d) => (
                <View key={d.id} style={styles.item}>
                  <View style={[styles.dot, { backgroundColor: scoreColor(d.score) }]} />
                  <Pressable
                    onPress={() => router.push({ pathname: '/date/[id]', params: { id: d.id } })}
                    style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{d.personName}</Text>
                      <Text style={styles.meta}>{d.activity} · {dayLabel(d.day)}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: alpha(scoreColor(d.score), 0.12) }]}>
                      <Text style={[styles.pillText, { color: scoreColor(d.score) }]}>{d.score}</Text>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.screenTitle, color: color.ink, marginBottom: 4 },
  sub: { ...type.meta, color: color.faint, marginBottom: space.xxl },
  empty: { ...type.bodySm, color: color.faint },
  monthLabel: { ...type.sectionLabel, color: color.faint, marginBottom: space.md },
  rail: { paddingLeft: 22, borderLeftWidth: 2, borderLeftColor: color.cardBorderStrong },
  item: { position: 'relative', paddingBottom: space.md },
  dot: { position: 'absolute', left: -29, top: 4, width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, borderColor: color.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.card, borderWidth: 1, borderColor: color.cardBorder, borderRadius: radius.md, padding: 13 },
  name: { ...type.rowTitle, color: color.ink },
  meta: { ...type.metaSm, color: color.faint },
  pill: { minWidth: 40, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center' },
  pillText: { ...type.rowTitle, fontSize: 15 },
});
