import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { color, radius, shadow, space, type } from './theme';

/** Icon paths transcribed from the design's inline SVGs. */
function HomeIcon({ tint }: { tint: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={1.9} strokeLinejoin="round">
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </Svg>
  );
}

function PeopleIcon({ tint }: { tint: string }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tint}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <Path d="M16 5.5a3 3 0 0 1 0 5.6M17 14c2.3.4 4 2.3 4 5" />
    </Svg>
  );
}

function TimelineIcon({ tint }: { tint: string }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tint}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

function AwardsIcon({ tint }: { tint: string }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tint}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Circle cx={12} cy={9} r={5.5} />
      <Path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5" />
    </Svg>
  );
}

const ICONS = {
  home: HomeIcon,
  people: PeopleIcon,
  timeline: TimelineIcon,
  awards: AwardsIcon,
} as const;

export type NavKey = keyof typeof ICONS;

type Item = { key: NavKey; label: string; onPress: () => void };

export type BottomNavProps = {
  items: readonly Item[];
  active: NavKey;
  onLogPress: () => void;
  /** Bottom safe-area inset, so the bar clears the home indicator. */
  inset: number;
};

/**
 * The design's five-slot bar: two tabs, a raised coral log button, two tabs.
 * The centre button is not a tab — it opens the log flow as a modal.
 */
export function BottomNav({ items, active, onLogPress, inset }: BottomNavProps) {
  const { t } = useTranslation();
  const [left, right] = [items.slice(0, 2), items.slice(2)];

  return (
    <BlurView intensity={24} tint="light" style={[styles.bar, { paddingBottom: inset }]}>
      {left.map((item) => (
        <Tab key={item.key} item={item} active={active === item.key} />
      ))}

      <View style={styles.logSlot}>
        <Pressable
          onPress={onLogPress}
          accessibilityRole="button"
          accessibilityLabel={t('nav.logDate')}
          style={styles.logButton}>
          <Svg width={26} height={26} viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
            <Path d="M12 5v14M5 12h14" />
          </Svg>
        </Pressable>
      </View>

      {right.map((item) => (
        <Tab key={item.key} item={item} active={active === item.key} />
      ))}
    </BlurView>
  );
}

function Tab({ item, active }: { item: Item; active: boolean }) {
  const tint = active ? color.coral : color.faint;
  const Icon = ICONS[item.key];
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={styles.tab}>
      <Icon tint={tint} />
      <Text style={[styles.tabLabel, { color: tint }]}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.cardBorder,
    backgroundColor: 'rgba(255,253,249,.9)',
  },
  tab: { flex: 1, alignItems: 'center', gap: space.xs, paddingBottom: 12 },
  tabLabel: type.navLabel,
  logSlot: { flex: 1, alignItems: 'center' },
  logButton: {
    width: 56,
    height: 56,
    marginTop: -16,
    borderRadius: radius.pill,
    backgroundColor: color.coral,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.coralSm,
  },
});
