/** signatureapi.com design tokens (website: src/styles/global.css and the Framer tokens). */
export const colors = {
  text: '#18181B',
  textSecondary: '#3F3F46',
  textTertiary: '#686870',
  textQuaternary: '#A1A1AA',
  border: '#E0E3E9',
  background: '#F9F9F9',
  card: '#FFFFFF',
  hover: '#F4F4F5',
  accent: '#2563EB',
  accentHalf: 'rgba(37, 99, 235, 0.5)',
  success: '#15803D',
  successSoft: '#ECFDF3',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
} as const;

export const radius = 10;

/**
 * The fonts from ../design/fonts, by PostScript name. iOS registers them
 * through UIAppFonts; Android finds them by file name in assets/fonts. The
 * file names match the PostScript names, so one name works on both. Pick the
 * weight through the family, never `fontWeight`, or Android synthesizes a
 * fake bold.
 */
export const fonts = {
  /** SignatureAPI's display face, for titles only. */
  brand: 'SignatureAPITitle-Medium',
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
} as const;
