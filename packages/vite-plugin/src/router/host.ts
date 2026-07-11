import type { SSRTarget, Manifest as ViteManifest } from 'vite';
import type { BuildEntryPoints } from '@/internal/build-entry-points';
import {
  createRouteAssetCaches,
  type RouteAssetCaches,
  type RouteClientAssets,
} from '@/internal/collect-route-assets';
import { defaultReadFileUtf8, type ReadFileUtf8 } from '@/internal/io';
import type {
  ImportMap,
  ResolvedWebRouterConfig,
  RouteMap,
  WebRouterPluginApi,
  WidgetModuleFilter,
} from '@/types';

/** Deferred client build graph inputs resolved during `configEnvironment`. */
export interface ClientBuildGraphContext {
  serverRoutemap: RouteMap;
  serverRoutemapPath: string;
}

/** Build-time state shared across @web-widget router plugins. */
export interface RouterBuildState {
  base: string;
  serverAssetsDir: string;
  clientBuildGraphContext?: ClientBuildGraphContext;
  clientImportmap?: ImportMap;
  clientRoutemapEntryPoints: BuildEntryPoints;
  dev: boolean;
  resolvedWebRouterConfig: ResolvedWebRouterConfig;
  resolveConditions?: string[];
  root: string;
  serverRoutemapEntryPoints: BuildEntryPoints;
  sourcemap: boolean;
  serverTarget: SSRTarget;
  useAppBuilder: boolean;
  widgetModuleFilter?: WidgetModuleFilter;
  /** Compound file extensions from adapters (e.g., `.html.ts`, `.html.js`). */
  compoundExtensions?: readonly string[];
  /** In-memory routemap while dev server is running (filesystem routing). */
  devServerRoutemap?: RouteMap;
  /** Shared cache for route asset collection across plugin instances. */
  routeAssetCaches?: RouteAssetCaches;
  /** Pre-computed during `buildStart` for O(1) SSR transform lookup. */
  routeClientAssets?: Map<string, RouteClientAssets>;
  /** Client manifest captured in-memory from the client build's bundle. */
  clientManifest?: ViteManifest;
}

export interface RouterPluginHost {
  readonly api: WebRouterPluginApi;
  /** @internal */
  readonly state: RouterBuildState;
  /** @internal */
  patchState(patch: Partial<RouterBuildState>): void;
  /** @internal */
  initialize(state: RouterBuildState): void;
  /** @internal */
  setDevServerRoutemap(routemap: RouteMap): void;
}

export interface CreateRouterPluginHostOptions {
  readFile?: ReadFileUtf8;
}

async function readJsonFile<T>(
  readFile: ReadFileUtf8,
  file: string,
  label: string
): Promise<T> {
  const data = await readFile(file);
  try {
    return JSON.parse(data) as T;
  } catch {
    throw new Error(`Failed to parse ${label}: ${file}`);
  }
}

export function createRouterPluginHost(
  options: CreateRouterPluginHostOptions = {}
): RouterPluginHost {
  const readFile = options.readFile ?? defaultReadFileUtf8;
  const state = {} as RouterBuildState;

  const api: WebRouterPluginApi = {
    get config() {
      if (!state.resolvedWebRouterConfig) {
        throw new Error('Web Router plugin is not initialized.');
      }
      return state.resolvedWebRouterConfig;
    },
    get build() {
      return state;
    },
    get widgetModuleFilter() {
      return state.widgetModuleFilter;
    },
    setWidgetModuleFilter(filter) {
      state.widgetModuleFilter = filter;
    },
    setCompoundExtensions(extensions) {
      state.compoundExtensions = extensions;
    },
    async clientImportmap() {
      const file = api.config.input.client.importmap;
      return readJsonFile<ImportMap>(readFile, file, 'client importmap');
    },
    async serverRoutemap() {
      if (state.dev && state.devServerRoutemap) {
        return state.devServerRoutemap;
      }
      const file = api.config.input.server.routemap;
      return readJsonFile<RouteMap>(readFile, file, 'server routemap');
    },
    getRouteAssetCaches() {
      if (!state.routeAssetCaches) {
        state.routeAssetCaches = createRouteAssetCaches();
      }
      return state.routeAssetCaches;
    },
    getRouteClientAssets() {
      if (!state.routeClientAssets) {
        state.routeClientAssets = new Map();
      }
      return state.routeClientAssets;
    },
  };

  return {
    api,
    state,
    patchState(patch) {
      Object.assign(state, patch);
    },
    initialize(next) {
      Object.assign(state, next);
    },
    setDevServerRoutemap(routemap: RouteMap) {
      state.devServerRoutemap = routemap;
    },
  };
}
