import type { ThemeConfig } from '../types';

/**
 * Simplified design system with only necessary tokens
 */

// Spacing system (rem) - only used values
const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
} as const;

// Typography system - only used values
const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
  },
  lineHeight: {
    normal: '1.5',
  },
  letterSpacing: {
    normal: '0',
  },
} as const;

// Box shadow system - only used values
const boxShadow = {
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
} as const;

// Z-index system
const zIndex = {
  TOOLTIP: 2147483647,
  TOOLBAR: 2147483646,
  OVERLAY: 2147483645,
} as const;

// Brand colors - only used values
const colors = {
  green: '#22c55e', // Primary green
  overlayBorder: '#22c55e',
} as const;

// Theme configuration
const themes = {
  light: {
    bg: 'rgba(255, 255, 255, 0.92)',
    fg: '#222',
    fgHover: '#111',
    fgSelected: '#000',
    border: '#e5e7eb',
    accent: '#888',
    accentHover: '#666',
    accentSelected: '#444',
    primary: colors.green,
    primaryHover: '#16a34a',
    primarySelected: '#15803d',
    overlayBorder: colors.overlayBorder,
  },
  dark: {
    bg: 'rgba(17, 17, 17, 0.92)',
    fg: '#f3f4f6',
    fgHover: '#ffffff',
    fgSelected: '#ffffff',
    border: '#374151',
    accent: '#9ca3af',
    accentHover: '#d1d5db',
    accentSelected: '#f3f4f6',
    primary: colors.green,
    primaryHover: '#4ade80',
    primarySelected: '#16a34a',
    overlayBorder: colors.overlayBorder,
  },
} as const satisfies Record<string, ThemeConfig>;

/**
 * Generate CSS custom properties for design system
 */
export function generateCSSVariables() {
  return {
    // Typography - only used values
    '--wwi-font-sans': typography.fontFamily.sans,
    '--wwi-font-size-xs': typography.fontSize.xs,
    '--wwi-font-size-sm': typography.fontSize.sm,
    '--wwi-font-size-base': typography.fontSize.base,
    '--wwi-font-weight-normal': typography.fontWeight.normal,
    '--wwi-font-weight-medium': typography.fontWeight.medium,
    '--wwi-font-weight-semibold': typography.fontWeight.semibold,
    '--wwi-line-height-normal': typography.lineHeight.normal,
    '--wwi-letter-spacing-normal': typography.letterSpacing.normal,

    // Spacing - only used values
    '--wwi-spacing-xs': spacing.xs,
    '--wwi-spacing-sm': spacing.sm,
    '--wwi-spacing-md': spacing.md,
    '--wwi-spacing-lg': spacing.lg,
    '--wwi-spacing-xl': spacing.xl,

    // Box shadow - only used values
    '--wwi-shadow-base': boxShadow.base,

    // Z-index - only used values
    '--wwi-z-tooltip': zIndex.TOOLTIP.toString(),
    '--wwi-z-toolbar': zIndex.TOOLBAR.toString(),
    '--wwi-z-overlay': zIndex.OVERLAY.toString(),

    // Brand colors - only used values
    '--wwi-green': colors.green,
    '--wwi-overlay-border': colors.overlayBorder,
  } as const;
}

// Design system utility functions
export const designSystem = {
  spacing,
  typography,
  boxShadow,
  zIndex,
  colors,
  themes,
  cssVariables: generateCSSVariables(),
} as const;

export const DESIGN_SYSTEM = {
  spacing: spacing,
  typography: typography,
  boxShadow: boxShadow,
  zIndex: zIndex,
  colors: colors,
} as const;

// Get theme variables
export function getThemeVariables(theme: keyof typeof themes): ThemeConfig {
  return themes[theme];
}

// Export design system instance
export default designSystem;
