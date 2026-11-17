import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon } from './ui/Icon';
import { Txt } from './ui/Txt';

export function Wordmark() {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="BusBuddy">
      <View style={[styles.plate, { backgroundColor: colors.accent }]}>
        <Icon name="bus" size={20} color={colors.onAccent} />
      </View>
      <Txt variant="title" style={{ fontSize: 20 }}>
        BusBuddy
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  plate: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
