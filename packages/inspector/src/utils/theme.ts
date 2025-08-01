import type { ThemeMap, ThemeConfig } from '../types';
import { getThemeVariables, designSystem } from './design-system';

export function applyTheme(vars: ThemeConfig): void {
  // Remove existing design system styles
  const existingStyle = document.getElementById('wwi-design-system-styles');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element
  const style = document.createElement('style');
  style.id = 'wwi-design-system-styles';

  // Generate CSS variables
  const cssVariables = Object.entries(designSystem.cssVariables)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join('\n');

  const themeVariables = `
  --wwi-bg: ${vars.bg};
  --wwi-fg: ${vars.fg};
  --wwi-border: ${vars.border};
  --wwi-accent: ${vars.accent};
  `;

  style.textContent = `
:root {
${cssVariables}
${themeVariables}
}
  `;

  document.head.appendChild(style);
}

export function detectAutoTheme(): keyof ThemeMap | undefined {
  if (
    typeof document === 'undefined' ||
    !document.body ||
    !document.documentElement
  ) {
    return undefined;
  }

  const bodyStyle = getComputedStyle(document.body);
  let bg = bodyStyle?.backgroundColor;
  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
    const docStyle = getComputedStyle(document.documentElement);
    bg = docStyle?.backgroundColor;
  }

  let isTransparent = false;
  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
    bg = 'rgb(255,255,255)';
    isTransparent = true;
  }

  let r = 255;
  let g = 255;
  let b = 255;

  const match = bg.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const parts = match[1]?.split(',').map((x) => parseFloat(x.trim())) ?? [];
    r = parts[0] ?? 255;
    g = parts[1] ?? 255;
    b = parts[2] ?? 255;
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (isTransparent || Number.isNaN(brightness) || brightness >= 128) {
    return 'light';
  } else {
    return 'dark';
  }
}

export function applyThemeMode(mode: keyof ThemeMap | 'auto'): void {
  if (mode !== 'auto') {
    const theme = getThemeVariables(mode);
    if (theme) {
      applyTheme(theme);
    }
    return;
  }

  const autoTheme = detectAutoTheme();
  if (autoTheme) {
    const theme = getThemeVariables(autoTheme);
    if (theme) {
      applyTheme(theme);
    } else {
      // Fallback to light theme if auto detection fails
      applyTheme(getThemeVariables('light'));
    }
  } else {
    // Fallback to light theme if auto detection fails
    applyTheme(getThemeVariables('light'));
  }
}
