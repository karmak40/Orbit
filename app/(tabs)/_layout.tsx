import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, type NavKey } from '../../src/ui/BottomNav';
import { color } from '../../src/ui/theme';

/**
 * Nav slots in bar order. The centre slot is the log button, not a tab.
 *
 * Tab switching goes through the navigator (`navigation.navigate(routeName)`)
 * rather than `router.navigate('/path')`: the router variant updates the URL but
 * leaves the tab navigator on its current screen.
 */
const SLOTS: readonly { route: string; key: NavKey; label: string }[] = [
  { route: 'index', key: 'home', label: 'Home' },
  { route: 'people', key: 'people', label: 'People' },
  { route: 'timeline', key: 'timeline', label: 'Timeline' },
  { route: 'awards', key: 'awards', label: 'Awards' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.surface },
      }}
      tabBar={({ state, navigation }) => {
        const activeRoute = state.routes[state.index]?.name ?? 'index';
        const active = SLOTS.find((s) => s.route === activeRoute)?.key ?? 'home';
        return (
          <BottomNav
            active={active}
            inset={insets.bottom}
            onLogPress={() => router.push('/log')}
            items={SLOTS.map((slot) => ({
              key: slot.key,
              label: slot.label,
              onPress: () => navigation.navigate(slot.route),
            }))}
          />
        );
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="people" />
      <Tabs.Screen name="timeline" />
      <Tabs.Screen name="awards" />
    </Tabs>
  );
}
