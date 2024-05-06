import type WebRouter from '@web-widget/web-router';
import type { z } from 'zod';
import type { Manifest, StartOptions } from '@web-widget/web-router';
import type { FilterPattern, Plugin, Manifest as ViteManifest } from 'vite';
import type { WebRouterConfigSchema } from './config';
import type { RouteSourceFile } from './dev/routing/types';

////////////////////////////////////////
//////                            //////
//////       WebRouterPlugin      //////
//////                            //////
////////////////////////////////////////

export interface ResolvedWebRouterConfig {
  autoFullBuild: boolean;
  filesystemRouting: {
    basePathname: string;
    dir: string;
    enabled: boolean;
    overridePathname: (pathname: string, source: RouteSourceFile) => string;
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
    ssrManifest: string;
  };
}

export interface WebRouterUserConfig
  extends z.input<typeof WebRouterConfigSchema> {}

export interface WebRouterServerEntryModule {
  default: (manifest: Manifest, options: StartOptions) => WebRouter;
}

export interface WebRouterClientEntryModule {}

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
export type ImportMap = {
  imports?: Imports;
  scopes?: Scopes;
};

export interface WebRouterPlugin extends Plugin {
  name: '@widget:build-web-router-entry';
  api: {
    config: ResolvedWebRouterConfig;
    clientImportmap(): Promise<ImportMap>;
    serverRoutemap(): Promise<RouteMap>;
  };
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
