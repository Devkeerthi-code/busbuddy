import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, tap, type Palette } from '@/theme/tokens';
import { Icon } from './Icon';
import { Txt } from './Txt';

/** One surface with hairline dividers: denser and calmer than a stack of separate cards. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View accessibilityRole="list" style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.line }]} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  detail?: string;
  detailColor?: keyof Palette;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** marks the row as the next thing to do */
  highlighted?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ListRow({ title, detail, detailColor = 'ink2', leading, trailing, highlighted, onPress, accessibilityLabel }: RowProps) {
  const { colors } = useTheme();
  const body = (
    <>
      {highlighted && <View style={[styles.marker, { backgroundColor: colors.accent }]} />}
      {leading}
      <View style={styles.text}>
        <Txt variant="label" style={styles.title} numberOfLines={2}>
          {title}
        </Txt>
        {detail ? (
          <Txt variant="label" color={detailColor} style={styles.detail} numberOfLines={2}>
            {detail}
          </Txt>
        ) : null}
      </View>
      {trailing}
      {onPress && !trailing && <Icon name="chevronRight" size={20} color={colors.ink2} />}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, borderWidth: 1.5, overflow: 'hidden' },
  divider: { height: 1, marginLeft: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: tap.min + 16,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  marker: { position: 'absolute', left: 0, top: space[3], bottom: space[3], width: 4, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 22 },
  detail: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
