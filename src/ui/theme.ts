/**
 * Design tokens extracted from `design/Dating Tracker.dc.html`.
 * Every colour, radius and type style used by a screen should come from here —
 * no raw hex in components.
 */

export const color = {
  /** App surface behind cards. */
  surface: '#f2ece3',
  /** Page background outside the app frame. */
  page: '#e7e0d6',
  /** Card / raised surface. */
  card: '#fffdf9',
  cardBorder: 'rgba(36,31,27,.07)',
  cardBorderStrong: 'rgba(36,31,27,.12)',
  cardBorderDashed: 'rgba(36,31,27,.16)',

  /** Dark "hero" cards — level card, awards roadmap, AI card. */
  inkGradient: ['#2a2521', '#3a332c'] as const,
  /** Splash / lock background. */
  nightGradient: ['#3a332c', '#241f1b'] as const,

  ink: '#241f1b',
  text: '#3a332c',
  textSoft: '#5a5148',
  textMuted: '#4a423b',
  muted: '#8a7d6d',
  faint: '#a89c8f',
  fainter: '#b8a99a',
  disabled: '#d8c9bd',

  /** Primary action. */
  coral: '#d85a4a',
  /** Links, destructive, low-score band. */
  red: '#c24a3a',
  gold: '#c8912f',
  goldLight: '#e0b25a',
  olive: '#6d8a53',

  chip: '#efe6d8',
  chipAlt: '#e9e0d3',
  chipDeep: '#e6ddd0',

  /** On-dark text tints. */
  onInk: '#f2ece3',
  onInkSoft: 'rgba(242,236,227,.65)',
  onInkFaint: 'rgba(242,236,227,.45)',
  onInkTrack: 'rgba(242,236,227,.15)',
} as const;

export const font = {
  /** Display serif — headings, scores, grades. Only weight 400 exists. */
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  /** UI sans. */
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemi: 'HankenGrotesk_600SemiBold',
  sansBold: 'HankenGrotesk_700Bold',
  sansHeavy: 'HankenGrotesk_800ExtraBold',
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  hero: 24,
  sheet: 28,
  pill: 999,
} as const;

export const space = {
  /** Standard horizontal screen gutter. */
  gutter: 20,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

/**
 * Type styles, transcribed from the design's `font:` shorthands.
 * `family` + `size` + `lineHeight` + `letterSpacing` only — colour is per-use.
 */
export const type = {
  /** 30px serif screen title ("People", "Timeline", "Settings"). */
  screenTitle: { fontFamily: font.serif, fontSize: 30, lineHeight: 32 },
  /** 28px serif — person name, date activity, log heading. */
  title: { fontFamily: font.serif, fontSize: 28, lineHeight: 31 },
  /** 26px serif — level name, welcome back, result verdict. */
  titleSm: { fontFamily: font.serif, fontSize: 26, lineHeight: 29 },
  /** 34/32px serif — onboarding slide headline. */
  onboarding: { fontFamily: font.serif, fontSize: 34, lineHeight: 37 },
  /** 19–21px serif — pull quotes, insight teasers. */
  quote: { fontFamily: font.serif, fontSize: 19, lineHeight: 26 },
  quoteLg: { fontFamily: font.serif, fontSize: 21, lineHeight: 28 },
  /**
   * Big numbers. `lineHeight` carries real headroom above `fontSize` (not the
   * design's CSS `line-height:1`) — Instrument Serif's glyphs run taller than
   * its em-box, and React Native's text layout (unlike a browser's) clips the
   * top of digits when the line box is that tight.
   */
  metric: { fontFamily: font.serif, fontSize: 40, lineHeight: 46 },
  metricSm: { fontFamily: font.serif, fontSize: 26, lineHeight: 30 },
  metricLg: { fontFamily: font.serif, fontSize: 64, lineHeight: 74 },
  gradeHuge: { fontFamily: font.serif, fontSize: 120, lineHeight: 138 },

  /** All-caps section label / kicker. */
  kicker: {
    fontFamily: font.sansSemi,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
  },
  sectionLabel: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  /** Card / row headings. */
  rowTitle: { fontFamily: font.sansBold, fontSize: 15 },
  rowTitleLg: { fontFamily: font.sansBold, fontSize: 16 },
  label: { fontFamily: font.sansSemi, fontSize: 15 },
  /** Body copy. */
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 25 },
  bodySm: { fontFamily: font.sans, fontSize: 15, lineHeight: 22 },
  bodyXs: { fontFamily: font.sans, fontSize: 14, lineHeight: 21 },
  /** Supporting / meta text. */
  meta: { fontFamily: font.sansMedium, fontSize: 13 },
  metaSm: { fontFamily: font.sansMedium, fontSize: 12 },
  metaXs: { fontFamily: font.sansMedium, fontSize: 11 },
  /** Interactive text. */
  action: { fontFamily: font.sansSemi, fontSize: 13 },
  button: { fontFamily: font.sansBold, fontSize: 16 },
  buttonSm: { fontFamily: font.sansBold, fontSize: 14 },
  navLabel: { fontFamily: font.sansSemi, fontSize: 10 },
} as const;

/** Score band thresholds — used for every score colour in the app. */
export const SCORE_BAND = { good: 80, fair: 62 } as const;

/** Mirrors `scoreColor()` in the prototype. */
export function scoreColor(score: number): string {
  if (score >= SCORE_BAND.good) return color.olive;
  if (score >= SCORE_BAND.fair) return color.gold;
  return color.red;
}

/** Soft tinted background for a score pill / avatar at a given score. */
export function scoreTint(score: number): string {
  if (score >= SCORE_BAND.good) return '#e3ead9';
  if (score >= SCORE_BAND.fair) return '#f2e6cd';
  return '#efe0dc';
}

/** `#rrggbb` + alpha byte, the trick the prototype uses (`color + '1a'`). */
export function alpha(hex: string, a: number): string {
  const byte = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${byte}`;
}

/**
 * Shadows, as `boxShadow` strings copied straight from the design's CSS.
 * The legacy `shadow*` props are deprecated in RN 0.86 and warn on web.
 */
export const shadow = {
  /** Coral primary button lift — the raised log button. */
  coralSm: { boxShadow: '0 8px 20px -6px rgba(216,90,74,.7)' },
  /** Coral full-width CTA. */
  coral: { boxShadow: '0 10px 24px -10px rgba(216,90,74,.7)' },
  /** Dark hero card. */
  hero: { boxShadow: '0 12px 30px -12px rgba(40,30,20,.5)' },
} as const;

/** Animation durations, transcribed from the design's keyframes. */
export const motion = {
  fadeUp: 400,
  pop: 500,
  barGrow: 1000,
  slideIn: 350,
  /** Result score count-up. */
  reveal: 950,
  /** Splash hold before onboarding. */
  splash: 2100,
} as const;
