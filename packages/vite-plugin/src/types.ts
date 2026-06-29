import type WebRouter from '@web-widget/web-router';
import type { z } from 'zod';
import type { Manifest, StartOptions } from '@web-widget/web-router';
import type { FilterPattern, Plugin, Manifest as ViteManifest } from 'vite';
import type { WebRouterConfigSchema } from './internal/config';
import type { RouteSourceFile } from './dev/routing/types';
import type { RouterBuildState } from './router/host';

export type { RouterBuildState } from './router/host';

////////////////////////////////////////
//////                            //////
//////       WebRouterPlugin      //////
//////                            //////
////////////////////////////////////////

export interface ResolvedWebRouterConfig {
  ignore: string[];
  asyncContext: {
    enabled: boolean;
  };
  widget: {
    searchDirs: string[];
  };
  serverAction: {
    enabled: boolean;
  };
  filesystemRouting: {
    basePathname: string;
    dir: string;
    enabled: boolean;
    overridePathname: (pathname: string, source: RouteSourceFile) => string;
  };
  importShim: {
    enabled: boolean;
    url: string;
  };
  input: {
    client: {
      entry: string;
      importmap: string;
    };
    server: {
      entry: string;
      routemap: string;
    };
  };
  output: {
    client: string;
    dir: string;
    manifest: string;
    server: string;
  };
}

export interface WebRouterUserConfig extends z.input<
  typeof WebRouterConfigSchema
> {}

export interface WebRouterServerEntryModuleV1 {
  default: (manifest: Manifest, options: StartOptions) => WebRouter;
}

export interface WebRouterServerEntryModuleV2 {
  default: WebRouter;
}

export interface WebRouterClientEntryModuleV1 {}

export interface WebRouterClientEntryModuleV2 {}

export interface RouteMap {
  $schema?: string;
  routes?: {
    module: string;
    name?: string;
    pathname: string;
  }[];
  middlewares?: {
    module: string;
    name?: string;
    pathname: string;
  }[];
  actions?: {
    module: string;
    name?: string;
    pathname: string;
  }[];
  fallbacks?: {
    module: string;
    name?: string;
    pathname: string;
    status: number;
  }[];
  layout?: {
    module: string;
    name?: string;
  };
}

type Imports = Record<string, string>;
type Scopes = Record<string, Imports>;
export interface ImportMap {
  imports?: Imports;
  scopes?: Scopes;
}

/**
 * Whether a module path should be treated as a widget module for build graph,
 * manifest links, and dev meta collection.
 */
export type WidgetModuleFilter = (modulePath: string) => boolean;

/** @deprecated Use `WidgetModuleFilter`. */
export type DynamicImportPredicate = WidgetModuleFilter;

export interface WebRouterPluginApi {
  readonly config: ResolvedWebRouterConfig;
  /** @internal Build-time state populated during the config hook. */
  readonly build: Readonly<RouterBuildState>;
  clientImportmap(): Promise<ImportMap>;
  serverRoutemap(): Promise<RouteMap>;
  readonly widgetModuleFilter?: WidgetModuleFilter;
  setWidgetModuleFilter(filter: WidgetModuleFilter): void;
  /** @deprecated Use `widgetModuleFilter`. */
  readonly dynamicImportPredicate?: WidgetModuleFilter;
  /** @deprecated Use `setWidgetModuleFilter`. */
  setDynamicImportPredicate(filter: WidgetModuleFilter): void;
}

export interface WebRouterPlugin extends Plugin<WebRouterPluginApi> {
  name: '@web-widget:router';
}

////////////////////////////////////////
//////                            //////
//////       WebWidgetPlugin      //////
//////                            //////
////////////////////////////////////////

export interface ResolvedWebWidgetConfig {
  provide: string;
  manifest?: ViteManifest;
  export?: {
    /** @default `"render"` */
    inject?: string | string[];
    extractFromExportDefault?: {
      name: string;
      default: string;
      exclude?: FilterPattern;
      include?: FilterPattern;
    }[];
    exclude?: FilterPattern;
    include?: FilterPattern;
  };
  import?: {
    /** @default `"defineWebWidget"` */
    inject?: string;
    cache?: Set<string>;
    /** @deprecated Please use `import.includeImporter` instead. */
    component?: FilterPattern;
    exclude?: FilterPattern;
    excludeImporter?: FilterPattern;
    include?: FilterPattern;
    includeImporter?: FilterPattern;
  };
}

export interface WebWidgetUserConfig extends ResolvedWebWidgetConfig {
  /** @deprecated Please use `export` instead. */
  toWebWidgets?: ResolvedWebWidgetConfig['export'];
  /** @deprecated Please use `import` instead. */
  toComponents?: ResolvedWebWidgetConfig['import'];
}
