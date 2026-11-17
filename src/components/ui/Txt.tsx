import { Text, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { type Palette, type as typeScale } from '@/theme/tokens';

type Props = TextProps & {
  variant?: keyof typeof typeScale;
  color?: keyof Palette;
  /** tabular figures so minutes and times don't jiggle as they change */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
};

export function Txt({ variant = 'body', color = 'ink', tabular, align, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        typeScale[variant],
        { color: colors[color], textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
