import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from './theme';

export type ScreenProps = {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. the keypad). */
  scroll?: boolean;
  /** Extra bottom padding, e.g. to clear a sticky footer. */
  bottomInset?: number;
};

/**
 * Standard screen chrome: warm surface, top safe-area inset, the design's 20px
 * gutter, and a hidden scrollbar (the design hides scrollbars everywhere).
 */
export function Screen({ children, scroll = true, bottomInset = 30 }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + space.sm, paddingBottom: bottomInset };

  if (!scroll) {
    return <View style={[styles.root, padding, styles.gutter]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[padding, styles.gutter]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  gutter: { paddingHorizontal: space.gutter },
});
