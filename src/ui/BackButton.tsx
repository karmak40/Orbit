import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { color, radius, space, type } from './theme';

export type BackButtonProps = {
  /** The screen being returned to — shown as the label on iOS ("‹ People"). */
  label: string;
  onPress: () => void;
};

/**
 * Back navigation, styled per-platform rather than as a plain text link:
 * iOS shows a chevron + destination label (HIG convention — "back to X"),
 * Android shows an icon-only arrow (Material convention; the destination is
 * implied by the screen content, not restated in the app bar). Both get a
 * real ≥44×44pt tap target via `hitSlop` and a visible pressed state, not
 * just a small run of coloured text.
 */
export function BackButton({ label, onPress }: BackButtonProps) {
  const iconOnly = Platform.OS === 'android';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
      hitSlop={10}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 5l-7 7 7 7" />
        </Svg>
      </View>
      {!iconOnly ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: 6,
    paddingRight: 14,
    paddingLeft: 6,
    borderRadius: radius.pill,
  },
  pressed: { backgroundColor: color.chip },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.label, color: color.ink, marginLeft: 2 },
});
