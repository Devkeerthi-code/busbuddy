import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { space, tap } from '@/theme/tokens';

export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Big, plain tab bar with an amber marker on the current tab. */
export function TabBar({ state, descriptors, emitter, navigateToTab, icons }: TabBarProps & { icons: Record<string, IconName> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.line }]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            style={styles.tab}
          >
            <View style={[styles.indicator, { backgroundColor: focused ? colors.accent : 'transparent' }]} />
            <Icon name={icons[route.name] ?? 'home'} color={focused ? colors.ink : colors.ink2} />
            <Txt variant="label" color={focused ? 'ink' : 'ink2'} style={{ fontSize: 12 }}>
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, minHeight: tap.min + 12, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: space[1] },
  indicator: { position: 'absolute', top: 0, width: 32, height: 3, borderRadius: 2 },
});
