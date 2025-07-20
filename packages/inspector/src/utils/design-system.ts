import type { ThemeConfig } from '../types';

/**
 * Design system constants
 */

// Spacing system (rem)
const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  '4xl': '2.5rem',
  '5xl': '3rem',
} as const;

// Typography system
const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  letterSpacing: {
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// Border radius system
const borderRadius = {
  none: '0',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

// Shadow system
const boxShadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// Opacity system
const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  85: '0.85',
  90: '0.9',
  95: '0.95',
  98: '0.98',
  100: '1',
} as const;

// Blur system
const backdropBlur = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
} as const;

// Transition system
const transition = {
  none: 'none',
  all: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  colors:
    'color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Z-index system
const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modal: '1040',
  popover: '1050',
  tooltip: '1060',
  toast: '1070',
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
    primary: 'rgba(102, 126, 234, 1)',
    primaryHover: 'rgba(102, 126, 234, 0.9)',
    primarySelected: 'rgba(102, 126, 234, 1)',
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
    primary: 'rgba(102, 126, 234, 1)',
    primaryHover: 'rgba(102, 126, 234, 0.9)',
    primarySelected: 'rgba(102, 126, 234, 1)',
  },
} as const satisfies Record<string, ThemeConfig>;

// Design system utility functions
export const designSystem = {
  spacing,
  typography,
  borderRadius,
  boxShadow,
  opacity,
  backdropBlur,
  transition,
  zIndex,
  themes,
} as const;

export const DESIGN_SYSTEM = {
  spacing: spacing,
  typography: typography,
  borderRadius: borderRadius,
  boxShadow: boxShadow,
  opacity: opacity,
  backdropBlur: backdropBlur,
  transition: transition,
  zIndex: zIndex,
} as const;

// Get theme variables
export function getThemeVariables(theme: keyof typeof themes): ThemeConfig {
  return themes[theme];
}

// Export design system instance
export default designSystem;
