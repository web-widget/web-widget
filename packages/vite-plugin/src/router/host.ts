import type { SSRTarget } from 'vite';
import type { BuildEntryPoints } from '@/internal/build-entry-points';
import type { RouteClientAssetsIndex } from '@/internal/collect-route-assets';
import { defaultReadFileUtf8, type ReadFileUtf8 } from '@/internal/io';
import type {
  DynamicImportPredicate,
  ImportMap,
  ResolvedWebRouterConfig,
  RouteMap,
  WebRouterPluginApi,
} from '@/types';

/** Build-time state shared across @web-widget router plugins. */
export interface RouterBuildState {
  base: string;
  clientImportmap?: ImportMap;
  clientRoutemapEntryPoints: BuildEntryPoints;
  dev: boolean;
  resolvedWebRouterConfig: ResolvedWebRouterConfig;
  resolveConditions?: string[];
  root: string;
  routeClientAssets: RouteClientAssetsIndex;
  serverRoutemapEntryPoints: BuildEntryPoints;
  sourcemap: boolean;
  serverTarget: SSRTarget;
  useAppBuilder: boolean;
  dynamicImportPredicate?: DynamicImportPredicate;
}

export interface RouterPluginHost {
  readonly api: WebRouterPluginApi;
  /** @internal */
  readonly state: RouterBuildState;
  /** @internal */
  patchState(patch: Partial<RouterBuildState>): void;
  /** @internal */
  initialize(state: RouterBuildState): void;
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
    get dynamicImportPredicate() {
      return state.dynamicImportPredicate;
    },
    setDynamicImportPredicate(predicate) {
      state.dynamicImportPredicate = predicate;
    },
    async clientImportmap() {
      const file = api.config.input.client.importmap;
      return readJsonFile<ImportMap>(readFile, file, 'client importmap');
    },
    async serverRoutemap() {
      const file = api.config.input.server.routemap;
      return readJsonFile<RouteMap>(readFile, file, 'server routemap');
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
  };
}
