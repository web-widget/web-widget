import type WebRouter from '@web-widget/web-router';
import type { z } from 'zod';
import type { Manifest, StartOptions } from '@web-widget/web-router';
import type { Plugin } from 'vite';
import type { BuilderConfigSchema } from './config';
import type { RouteSourceFile } from './dev/routing/types';

export interface Input {
  client: {
    entry: string;
    importmap: string;
  };
  server: {
    entry: string;
    routemap: string;
  };
}

export interface Output {
  client: string;
  dir: string;
  manifest: string;
  server: string;
  ssrManifest: string;
}

export interface ResolvedBuilderConfig {
  autoFullBuild: boolean;
  filesystemRouting: {
    basePathname: string;
    dir: string;
    enabled: boolean;
    overridePathname: (pathname: string, source: RouteSourceFile) => string;
  };
  input: Input;
  output: Output;
}

export interface BuilderUserConfig
  extends z.input<typeof BuilderConfigSchema> {}

export interface BuilderConfig extends z.output<typeof BuilderConfigSchema> {}

export interface ServerEntryModule {
  default: (manifest: Manifest, options: StartOptions) => WebRouter;
}

export interface ClientEntryModule {}

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

export interface PluginApi {
  config: ResolvedBuilderConfig;
  clientImportap(): Promise<ImportMap>;
  serverRoutemap(): Promise<RouteMap>;
}

export interface WebRouterPlugin extends Plugin {
  name: 'vite-plugin-web-router';
  api: PluginApi;
}
