/**
 * "Daybook" — a light, professional financial identity. Named for the
 * ledger's own predecessor: the book where entries are first recorded
 * before being posted. Bone-paper surfaces, navy for trust and brand,
 * forest green and brick red for financial polarity, antique brass for
 * the tax/AI accent. No neon, no glow — depth comes from soft paper-lift
 * shadows and hairline "ledger rules," not colored light.
 */
export const colors = {
  background: '#F6F6F1',
  void: '#F6F6F1',
  surface: '#FFFFFF',
  surfaceElevated: '#F1EFE8',
  border: '#E4E2D9',
  borderStrong: '#CFCCBD',
  textPrimary: '#14161B',
  textSecondary: '#4A5058',
  textMuted: '#7B818B',

  primary: '#1B2A44',
  primarySoft: 'rgba(27,42,68,0.08)',
  primaryGlow: 'rgba(27,42,68,0.16)',

  income: '#1F7A5B',
  incomeSoft: 'rgba(31,122,91,0.12)',
  expense: '#A93F2E',
  expenseSoft: 'rgba(169,63,46,0.12)',

  gold: '#AC8A46',
  goldSoft: 'rgba(172,138,70,0.14)',
  goldForeground: '#1C1710',

  ai: '#AC8A46',
  aiSoft: 'rgba(172,138,70,0.12)',

  /** Translucent chip-on-photo overlay used on the camera screen (camera UI stays dark regardless of app theme). */
  glass: '#FFFFFF',
} as const;

/** Muted, "ledger ink" hues for categorical charts — sophistication over saturation. */
export const chartPalette = ['#1B2A44', '#1F7A5B', '#AC8A46', '#A93F2E', '#4C6B8A', '#7A5470'] as const;

/** Shared "paper lifted off the desk" elevation — soft and warm, never a colored glow. */
export const cardShadow = {
  shadowColor: '#14161B',
  shadowOpacity: 0.07,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Tighter, more architectural than a consumer app — precision over playfulness. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

/**
 * Font family tokens. Custom fonts must be set via `fontFamily` alone —
 * never combine with `fontWeight`, which makes RN try to synthesize a fake
 * bold on top of the already-specific weight file and can silently drop
 * the custom font entirely.
 */
export const fonts = {
  displayMedium: 'SpaceGrotesk-Medium',
  displaySemiBold: 'SpaceGrotesk-SemiBold',
  displayBold: 'SpaceGrotesk-Bold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
  monoSemiBold: 'JetBrainsMono-SemiBold',
} as const;
