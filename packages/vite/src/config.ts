import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import type { BuilderUserConfig, ResolvedBuilderConfig } from './types';

export const BUILDER_CONFIG_DEFAULTS: ResolvedBuilderConfig = {
  autoFullBuild: true,
  filesystemRouting: false,
  input: {
    client: {
      entry: 'entry.client',
      importmap: 'importmap.client',
    },
    server: {
      entry: 'entry.server',
      routemap: 'routemap.server',
    },
    routes: {
      basePathname: '/',
      dir: 'routes',
      trailingSlash: false,
    },
  },
  output: {
    client: 'client',
    dir: 'dist',
    manifest: 'manifest.json',
    server: 'server',
    ssrManifest: 'ssr-manifest.json',
  },
};

export const BuilderConfigSchema = z.object({
  autoFullBuild: z
    .boolean()
    .optional()
    .default(BUILDER_CONFIG_DEFAULTS.autoFullBuild),
  filesystemRouting: z
    .boolean()
    .optional()
    .default(BUILDER_CONFIG_DEFAULTS.filesystemRouting),
  input: z
    .object({
      client: z
        .object({
          entry: z
            .string()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.client.entry),
          importmap: z
            .string()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.client.importmap),
        })
        .optional()
        .default({}),
      server: z
        .object({
          entry: z
            .string()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.server.entry),
          routemap: z
            .string()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.server.routemap),
        })
        .optional()
        .default({}),
      routes: z
        .object({
          basePathname: z
            .string()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.routes.basePathname),
          dir: z
            .string()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.routes.dir),
          trailingSlash: z
            .boolean()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.routes.trailingSlash),
        })
        .optional()
        .default({}),
    })
    .optional()
    .default({}),
  output: z
    .object({
      client: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.client),
      dir: z.string().optional().default(BUILDER_CONFIG_DEFAULTS.output.dir),
      manifest: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.manifest),
      server: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.server),
      ssrManifest: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.ssrManifest),
    })
    .optional()
    .default({}),
});

let resolve: (value: unknown) => void;

const config = new Promise((_resolve) => {
  resolve = _resolve;
});

export function parseConfig(
  userConfig: BuilderUserConfig,
  root: string,
  extensions?: string[]
) {
  const builderConfig = BuilderConfigSchema.parse(
    userConfig
  ) as ResolvedBuilderConfig;
  const rules = {
    client: ['entry', 'importmap'],
    server: ['entry', 'routemap'],
    routes: ['dir'],
  };

  Object.entries(builderConfig['input']).forEach(([key, value]) => {
    Object.entries(value as string[]).forEach(([k, v]) => {
      // @ts-ignore
      if (rules[key].includes(k)) {
        value[k] = resolveRealFile(v, root, extensions);
      }
    });
  });

  return builderConfig;
}

export function setConfig(config: ResolvedBuilderConfig) {
  resolve(config);
}

export function getConfig(): Promise<ResolvedBuilderConfig> {
  return config as Promise<ResolvedBuilderConfig>;
}

function resolveRealFile(
  fileName: string,
  root: string,
  extensions: string[] = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
): string {
  const paths = ['', ...extensions].map((extension) =>
    path.resolve(root, `${fileName}${extension}`)
  );

  for (const file of paths) {
    if (fs.existsSync(file)) {
      return file;
    }
  }

  throw new Error(`File not found: ${paths.join(', ')}`);
}
