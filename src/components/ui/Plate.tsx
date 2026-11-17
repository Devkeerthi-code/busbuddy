import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { Txt } from './Txt';

type Props = {
  number: string;
  /** md shows the small BUS caption; sm is for dense lists */
  size?: 'sm' | 'md';
  /** not on the road: drawn neutral instead of amber */
  off?: boolean;
};

/** A bus number plate, the same object in every list, card and on the map. */
export function Plate({ number, size = 'md', off }: Props) {
  const { colors } = useTheme();
  const md = size === 'md';
  const fg = off ? colors.ink2 : colors.onAccent;
  return (
    <View
      accessibilityLabel={`Bus ${number}`}
      style={[md ? styles.md : styles.sm, { backgroundColor: off ? colors.surface2 : colors.accent }]}
    >
      {md && <Txt style={[styles.caption, { color: fg }]}>BUS</Txt>}
      <Txt
        tabular
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[md ? styles.numMd : styles.numSm, { color: off ? colors.ink : colors.onAccent }]}
      >
        {number}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  md: { width: 52, height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingHorizontal: 4 },
  sm: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  caption: { position: 'absolute', top: 4, fontFamily: fonts.black, fontSize: 9, lineHeight: 10, letterSpacing: 1 },
  numMd: { fontFamily: fonts.black, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  numSm: { fontFamily: fonts.black, fontSize: 17, lineHeight: 20, letterSpacing: -0.3 },
});
