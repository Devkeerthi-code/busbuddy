import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { space, tap } from '@/theme/tokens';

export function SetupHeader({ title, back = true }: { title: string; back?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/setup'))}
          style={styles.back}
        >
          <Icon name="chevronLeft" color={colors.ink} />
        </Pressable>
      )}
      <Txt variant="display" style={{ fontSize: 34, lineHeight: 38, flex: 1 }} accessibilityRole="header">
        {title}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  back: { width: tap.min, height: tap.min, alignItems: 'center', justifyContent: 'center', marginLeft: -space[3] },
});
