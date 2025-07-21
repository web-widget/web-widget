import type { HTMLWebWidgetElement } from '@web-widget/web-widget/element';

export interface ThemeConfig {
  bg: string;
  fg: string;
  fgHover: string;
  fgSelected: string;
  border: string;
  accent: string;
  accentHover: string;
  accentSelected: string;
  primary: string;
  primaryHover: string;
  primarySelected: string;
  overlayBorder: string;
}

export interface ThemeMap {
  light: ThemeConfig;
  dark: ThemeConfig;
}

export interface ElementBounds {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Re-export types from web-widget to avoid duplication
export type LoadingStrategy = HTMLWebWidgetElement['loading'];
export type RenderTarget = HTMLWebWidgetElement['renderTarget'];
