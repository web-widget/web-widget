import type {
  DevEnvironment,
  Environment,
  EnvironmentModuleNode,
  Plugin,
  TransformResult,
  ViteBuilder,
  ViteDevServer,
} from 'vite';
import { isRunnableDevEnvironment } from 'vite';

export function isServerEnvironment(
  environment: Environment | { config: { consumer: string } }
): boolean {
  return environment.config.consumer === 'server';
}

export function isClientEnvironment(
  environment: Environment | { config: { consumer: string } }
): boolean {
  return environment.config.consumer === 'client';
}

/**
 * Vite server-side dev environment (`environments.ssr`).
 * Docs use lowercase client / server for Vite environments.
 */
export function getServerEnvironmentFromDevServer(
  viteServer: ViteDevServer
): DevEnvironment {
  const environment = viteServer.environments.ssr;
  if (!environment) {
    throw new Error(
      'Expected Vite server environment at viteServer.environments.ssr.'
    );
  }
  return environment;
}

/** Server build environment from Vite builder (`environments.ssr`). */
export function getServerEnvironmentFromBuilder(builder: ViteBuilder) {
  const environment = builder.environments.ssr;
  if (!environment) {
    throw new Error(
      'Expected Vite server environment at builder.environments.ssr.'
    );
  }
  return environment;
}

/**
 * Minimal server dev environment surface used by `dev/meta.ts` so tests can mock
 * module graph crawling without a full Vite dev server.
 */
export interface ServerDevEnvironment {
  getModuleById(id: string): EnvironmentModuleNode | undefined;
  getModulesByFile(file: string): Set<EnvironmentModuleNode> | undefined;
  importModule(url: string): Promise<Record<string, any>>;
  readonly name: string;
  resolveId(
    specifier: string,
    importer: string
  ): Promise<{ id: string } | null | undefined>;
  readonly root: string;
  transformRequest(url: string): Promise<TransformResult | null>;
}

export function asServerDevEnvironment(
  environment: DevEnvironment
): ServerDevEnvironment {
  return {
    name: environment.name,
    root: environment.config.root,
    getModulesByFile(file) {
      return environment.moduleGraph.getModulesByFile(file);
    },
    getModuleById(id) {
      return environment.moduleGraph.getModuleById(id) ?? undefined;
    },
    async transformRequest(url) {
      return environment.transformRequest(url);
    },
    async resolveId(specifier, importer) {
      return environment.pluginContainer.resolveId(specifier, importer);
    },
    importModule(url) {
      return importServerModule(environment, url);
    },
  };
}

export async function importServerModule(
  environment: DevEnvironment,
  url: string
): Promise<Record<string, any>> {
  if (isRunnableDevEnvironment(environment)) {
    return environment.runner.import(url);
  }
  throw new Error(
    `Expected a RunnableDevEnvironment for "${environment.name}", got ${environment.constructor.name}.`
  );
}

export function applyToServerEnvironment(): Plugin['applyToEnvironment'] {
  return (environment) => isServerEnvironment(environment);
}

export function applyToClientEnvironment(): Plugin['applyToEnvironment'] {
  return (environment) => isClientEnvironment(environment);
}
