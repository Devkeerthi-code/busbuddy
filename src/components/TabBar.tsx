import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wordmark } from '@/components/Wordmark';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, tap } from '@/theme/tokens';

export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * Big, plain tab bar with an amber marker on the current tab. When the layout puts it on the
 * left (wide screens), the same tabs become a side rail like a desktop dashboard.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, icons }: TabBarProps & { icons: Record<string, IconName> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rail = descriptors[state.routes[state.index].key].options.tabBarPosition === 'left';

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key].options.title ?? route.name;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    const icon = icons[route.name] ?? 'home';

    if (rail) {
      return (
        <Pressable
          key={route.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: focused }}
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => [
            styles.railItem,
            { backgroundColor: focused ? colors.ink : pressed ? colors.surface2 : 'transparent' },
          ]}
        >
          <Icon name={icon} size={20} color={focused ? colors.bg : colors.ink2} />
          <Txt variant="label" style={{ fontSize: 15, color: focused ? colors.bg : colors.ink2 }}>
            {label}
          </Txt>
          {focused && <View style={[styles.railMarker, { backgroundColor: colors.accent }]} />}
        </Pressable>
      );
    }

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        style={styles.tab}
      >
        <View style={[styles.indicator, { backgroundColor: focused ? colors.accent : 'transparent' }]} />
        <Icon name={icon} color={focused ? colors.ink : colors.ink2} />
        <Txt variant="label" color={focused ? 'ink' : 'ink2'} style={{ fontSize: 12 }}>
          {label}
        </Txt>
      </Pressable>
    );
  });

  if (rail) {
    return (
      <View
        accessibilityRole="tablist"
        style={[styles.rail, { paddingTop: insets.top + space[5], backgroundColor: colors.surface, borderRightColor: colors.line }]}
      >
        <View style={styles.railBrand}>
          <Wordmark />
        </View>
        {tabs}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.line }]}
    >
      {tabs}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, minHeight: tap.min + 12, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: space[1] },
  indicator: { position: 'absolute', top: 0, width: 32, height: 3, borderRadius: 2 },
  rail: { width: 232, borderRightWidth: 1, paddingHorizontal: space[3], gap: 2 },
  railBrand: { paddingHorizontal: space[2], paddingBottom: space[5] },
  railItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: tap.min,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
  railMarker: { marginLeft: 'auto', width: 8, height: 8, borderRadius: 4 },
});
