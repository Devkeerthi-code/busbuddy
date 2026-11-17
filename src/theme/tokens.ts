/** Design tokens from the approved concept: the destination board on the front of a college bus. */
export const palettes = {
  light: {
    bg: '#F3F1EC',
    surface: '#FFFFFF',
    surface2: '#E9E6DE',
    ink: '#121210',
    ink2: '#4A473F',
    line: '#D6D1C4',
    accent: '#FFB400',
    onAccent: '#121210',
    accentText: '#8C5B00',
    ontime: '#17703A',
    ontimeBg: '#E2F1E6',
    late: '#B8321A',
    lateBg: '#F8E3DE',
    board: '#121210',
    boardInk: '#FFB400',
    boardDim: '#7D6A35',
    boardText: '#F3F0E8',
    boardMuted: '#B9B4A6',
    boardRule: 'rgba(243,240,232,0.12)',
    boardOk: '#6EE09A',
    boardOkBg: '#183A23',
    boardLate: '#FF8C73',
    boardLateBg: '#45180F',
    boardIdle: '#CFCABD',
    boardIdleBg: '#2A2924',
    scrim: 'rgba(18,18,16,0.32)',
  },
  dark: {
    bg: '#0E0E0C',
    surface: '#191915',
    surface2: '#24231E',
    ink: '#F3F0E8',
    ink2: '#A8A396',
    line: '#34322B',
    accent: '#FFB400',
    onAccent: '#121210',
    accentText: '#FFC23D',
    ontime: '#4BC27D',
    ontimeBg: '#15291C',
    late: '#FF7559',
    lateBg: '#33170F',
    board: '#050504',
    boardInk: '#FFB400',
    boardDim: '#7D6A35',
    boardText: '#F3F0E8',
    boardMuted: '#B9B4A6',
    boardRule: 'rgba(243,240,232,0.12)',
    boardOk: '#6EE09A',
    boardOkBg: '#183A23',
    boardLate: '#FF8C73',
    boardLateBg: '#45180F',
    boardIdle: '#CFCABD',
    boardIdleBg: '#2A2924',
    scrim: 'rgba(0,0,0,0.5)',
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)['light']]: string };

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;
export const tap = { min: 48 } as const;

export const fonts = {
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  black: 'Barlow_800ExtraBold',
} as const;

export const type = {
  eta: { fontFamily: fonts.black, fontSize: 88, lineHeight: 88, letterSpacing: -3 },
  display: { fontFamily: fonts.black, fontSize: 44, lineHeight: 44, letterSpacing: -1.8 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  micro: { fontFamily: fonts.black, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' as const },
} as const;

export const motion = {
  fast: 120,
  base: 180,
  sheetSpring: { stiffness: 420, damping: 34, mass: 1 },
  holdToEndMs: 1200,
  pulseMs: 1800,
} as const;

export const mapStyles = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;
