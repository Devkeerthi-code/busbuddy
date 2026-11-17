import Svg, { Circle, Path } from 'react-native-svg';

const paths = {
  bus: 'M6 17V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v11M6 17h12M6 17v2m12-2v2M6 11h12M9 14h.01M15 14h.01',
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  check: 'm5 12 5 5 9-10',
  clock: 'M12 7v5l3 2',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zm4 4h4',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  plus: 'M12 5v14M5 12h14',
  arrowUp: 'm6 11 6-6 6 6M12 5v14',
  arrowDown: 'm6 13 6 6 6-6M12 19V5',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  refresh: 'M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7',
  wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.5m6 .2A10 10 0 0 1 19 13M2 9a15 15 0 0 1 4.5-3M12 20h.01',
  locate: 'M12 2v3m0 14v3M2 12h3m14 0h3',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m5 15a5 5 0 0 0-4-4.9',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2',
  share: 'M12 3v12m0-12L8 7m4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
} as const;

export type IconName = keyof typeof paths;

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 24, color, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {name === 'sun' && <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'clock' && <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'locate' && <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={strokeWidth} />}
      <Path d={paths[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
