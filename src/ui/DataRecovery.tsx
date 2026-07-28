import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DarkButton } from './Button';
import { color, space, type } from './theme';

export type DataRecoveryProps = {
  onRecover: () => Promise<void>;
};

/**
 * Full-screen gate shown when the initial load couldn't decrypt what's on
 * disk (`OrbitData.corrupted` — see `src/data/store.tsx`). Not a route, like
 * `Splash`/`Onboarding`/`Lock` — rendered directly by `app/_layout.tsx`,
 * checked before any of those so a stuck decrypt failure can never present as
 * a silent, unrecoverable crash again.
 */
export function DataRecovery({ onRecover }: DataRecoveryProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [working, setWorking] = useState(false);

  async function handlePress() {
    setWorking(true);
    await onRecover();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.glyph} />
      <Text style={styles.title}>{t('dataError.title')}</Text>
      <Text style={styles.body}>{t('dataError.body')}</Text>
      <View style={styles.footer}>
        <DarkButton label={t('dataError.cta')} onPress={handlePress} disabled={working} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface, alignItems: 'center', paddingHorizontal: space.gutter },
  glyph: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.red, marginBottom: 22, marginTop: space.xxl },
  title: { ...type.title, fontSize: 24, lineHeight: 29, color: color.ink, textAlign: 'center', marginBottom: space.md },
  body: { ...type.bodySm, color: color.textSoft, textAlign: 'center', maxWidth: 320 },
  footer: { marginTop: 'auto', width: '100%' },
});
