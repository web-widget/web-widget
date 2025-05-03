import type WebRouter from '@web-widget/web-router';
import type { z } from 'zod';
import type {
  Manifest,
  RoutePattern,
  StartOptions,
} from '@web-widget/web-router';
import type { FilterPattern, Plugin, Manifest as ViteManifest } from 'vite';
import type { WebRouterConfigSchema } from './config';
import type { Override, RouteSourceFile } from './dev/routing/types';

////////////////////////////////////////
//////                            //////
//////       WebRouterPlugin      //////
//////                            //////
////////////////////////////////////////

export interface ResolvedWebRouterConfig {
  autoFullBuild: boolean;
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
    /** @deprecated Use `override` instead. */
    overridePathname?(pathname: string, source: RouteSourceFile): string;
    override?: Override;
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

export interface WebRouterUserConfig
  extends z.input<typeof WebRouterConfigSchema> {}

export interface WebRouterServerEntryModuleV1 {
  default: (manifest: Manifest, options: StartOptions) => WebRouter;
}

export interface WebRouterServerEntryModuleV2 {
  default: WebRouter;
}

export interface WebRouterClientEntryModuleV1 {}

export interface WebRouterClientEntryModuleV2 {}

type RouteMapModule = {
  module: string;
};

type RouteMapScope = {
  name?: string;
} & RoutePattern;

type RouteMapStatus = {
  status: number;
};

type RouteMapRoute = RouteMapModule & RouteMapScope;
type RouteMapAction = RouteMapModule & RouteMapScope;
type RouteMapMiddleware = RouteMapModule & RouteMapScope;
type RouteMapFallback = RouteMapModule & RouteMapStatus & RouteMapScope;
type RouteMapLayout = RouteMapModule;

export interface RouteMap {
  $schema?: string;
  routes: RouteMapRoute[];
  actions: RouteMapAction[];
  middlewares: RouteMapMiddleware[];
  fallbacks: RouteMapFallback[];
  layout: RouteMapLayout;
}

type Imports = Record<string, string>;
type Scopes = Record<string, Imports>;
export interface ImportMap {
  imports?: Imports;
  scopes?: Scopes;
}

export interface WebRouterPluginApi {
  config: ResolvedWebRouterConfig;
  clientImportmap(): Promise<ImportMap>;
  serverRoutemap(): Promise<RouteMap>;
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
