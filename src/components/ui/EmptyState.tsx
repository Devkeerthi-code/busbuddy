import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

type Props = { icon: IconName; title: string; body: string; action?: ReactNode };

export function EmptyState({ icon, title, body, action }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { borderColor: colors.line }]}>
      <View style={[styles.icon, { backgroundColor: colors.surface2 }]}>
        <Icon name={icon} color={colors.ink2} />
      </View>
      <Txt variant="title" align="center">
        {title}
      </Txt>
      <Txt color="ink2" align="center" style={{ maxWidth: 320 }}>
        {body}
      </Txt>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: space[3],
    padding: space[5],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
