import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** pinned under the scroll area (e.g. the main action), above the keyboard */
  footer?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** tabs already pad the bottom */
  inTabs?: boolean;
};

export function Screen({ children, scroll = true, footer, onRefresh, refreshing = false, inTabs }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const content = [styles.content, { paddingTop: insets.top + space[4] }];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink2} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[content, styles.flex]}>{children}</View>
      )}
      {footer && (
        <View style={[styles.footer, { paddingBottom: (inTabs ? 0 : insets.bottom) + space[4], borderColor: colors.line, backgroundColor: colors.bg }]}>
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space[4], paddingBottom: space[7], gap: space[4], width: '100%', maxWidth: 720, alignSelf: 'center' },
  footer: { paddingHorizontal: space[4], paddingTop: space[3], gap: space[2], width: '100%', maxWidth: 720, alignSelf: 'center' },
});
