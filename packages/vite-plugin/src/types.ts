import type WebRouter from '@web-widget/web-router';
import type { z } from 'zod';
import type { Manifest, StartOptions } from '@web-widget/web-router';
import type { Plugin } from 'vite';
import type { WebRouterConfigSchema } from './internal/config';
import type { RouteSourceFile } from './dev/routing/types';
import type {
  RouteAssetCaches,
  RouteClientAssets,
} from './internal/collect-route-assets';
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
  css: {
    inlineStrategy: 'auto' | 'always' | 'never';
    inlineThreshold: number;
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

export interface WebRouterPluginApi {
  readonly config: ResolvedWebRouterConfig;
  /** @internal Build-time state populated during the config hook. */
  readonly build: Readonly<RouterBuildState>;
  clientImportmap(): Promise<ImportMap>;
  serverRoutemap(): Promise<RouteMap>;
  readonly widgetModuleFilter?: WidgetModuleFilter;
  setWidgetModuleFilter(filter: WidgetModuleFilter): void;
  /** Shared cache for route asset collection across plugin instances. */
  getRouteAssetCaches(): RouteAssetCaches;
  /** Pre-computed during `buildStart` for O(1) SSR transform lookup. */
  getRouteClientAssets(): Map<string, RouteClientAssets>;
}

export interface WebRouterPlugin extends Plugin<WebRouterPluginApi> {
  name: '@web-widget:router';
}

////////////////////////////////////////
//////                            //////
//////   WebWidgetAdapterConfig   //////
//////                            //////
////////////////////////////////////////

/**
 * Adapter entry in `WebWidgetPluginOptions.adapters`.
 * Can be a string (shorthand for `from`) or an object that overrides
 * the adapter's default `name` / `extensions` / `adapter` and adds
 * a `scope` for disambiguating extension conflicts.
 */
export interface WebWidgetAdapterConfig {
  /** Adapter package name, e.g. "@web-widget/react". */
  from: string;
  /** Override the adapter's declared name. */
  name?: string;
  /** Override the adapter's declared extensions. */
  extensions?: string[];
  /** Override the adapter's declared adapter subpath. */
  adapter?: string;
  /** Override the adapter's declared version. */
  version?: string;
  /**
   * Directory scopes (path prefixes). Only files under these directories
   * will match this adapter, used to disambiguate extension conflicts
   * (e.g. vue2 and vue3 both using `.vue`).
   */
  scope?: string[];
}

/**
 * Options for the adapter-based `webWidgetPlugin`.
 */
export interface WebWidgetPluginOptions {
  /**
   * Framework adapters to use. Each adapter tells the build tool
   * which files belong to which framework and where to get the
   * adapter implementation.
   */
  adapters: (string | WebWidgetAdapterConfig)[];
}
