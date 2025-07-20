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

export interface WidgetInfo {
  name: string;
  import: string;
  status: string;
  loading: string;
  renderTarget: string;
  inactive: boolean;
  recovering: boolean;
  hasContextData: boolean;
  hasContextMeta: boolean;
  performance: Array<{
    name: string;
    duration: number;
  }>;
}

export interface InspectorConfig {
  dir?: string;
  keys?: string[];
  routeModuleSource?: string;
  theme?: keyof ThemeMap | 'auto';
}

export type LoadingStrategy = 'eager' | 'lazy' | 'idle';
export type RenderTarget = 'light' | 'shadow';
export type InspectorMode = 'inactive' | 'active' | 'inspecting';
