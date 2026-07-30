import { useTranslation } from 'react-i18next';
import { Linking, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';

import { DarkButton, TextAction } from './Button';
import { color, space, type } from './theme';

export type AppErrorScreenProps = {
  error: Error;
  retry: () => Promise<void>;
};

/**
 * Fallback for expo-router's route-level `ErrorBoundary` convention (see
 * `app/_layout.tsx`). Renders in place of the ENTIRE app tree on any uncaught
 * render error, so unlike every other screen it cannot rely on
 * `SafeAreaProvider` or `OrbitDataProvider` — both are unmounted along with
 * whatever crashed. `useTranslation` still works: i18next is a global
 * singleton, not a context. Safe-area padding is approximated with the OS
 * status bar height rather than `useSafeAreaInsets()`.
 */
export function AppErrorScreen({ error, retry }: AppErrorScreenProps) {
  const { t } = useTranslation();
  const topPad = (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.xxl;

  function sendReport() {
    const subject = t('appError.reportSubject');
    const body = `${error.message}\n\n${error.stack ?? ''}`;
    Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.glyph} />
      <Text style={styles.title}>{t('appError.title')}</Text>
      <Text style={styles.body}>{t('appError.body')}</Text>
      <View style={styles.footer}>
        <DarkButton label={t('appError.retry')} onPress={() => void retry()} />
        <View style={styles.reportRow}>
          <TextAction label={t('appError.sendReport')} onPress={sendReport} color={color.textMuted} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface, alignItems: 'center', paddingHorizontal: space.gutter, paddingBottom: space.xl },
  glyph: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.red, marginBottom: 22, marginTop: space.xxl },
  title: { ...type.title, fontSize: 24, lineHeight: 29, color: color.ink, textAlign: 'center', marginBottom: space.md },
  body: { ...type.bodySm, color: color.textSoft, textAlign: 'center', maxWidth: 320 },
  footer: { marginTop: 'auto', width: '100%' },
  reportRow: { alignItems: 'center', marginTop: space.md },
});
