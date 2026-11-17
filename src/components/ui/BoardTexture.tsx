import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The faint LED dot grid of a bus destination board. Static SVG pattern, drawn once,
 * never animated, so it costs nothing on low-end phones.
 */
export function BoardTexture({ id }: { id: string }) {
  const { colors } = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Defs>
        <Pattern id={id} width={5} height={5} patternUnits="userSpaceOnUse">
          <Circle cx={2.5} cy={2.5} r={0.9} fill={colors.boardInk} fillOpacity={0.09} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
