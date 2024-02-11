import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { ResolvedBuilderConfig, BuilderUserConfig } from './types';

export const BUILDER_CONFIG_DEFAULTS: ResolvedBuilderConfig = {
  autoFullBuild: true,
  filesystemRouting: {
    basePathname: '/',
    dir: 'routes',
    enabled: false,
    overridePathname: (pathname) => pathname,
  },
  input: {
    client: {
      entry: 'entry.client',
      importmap: 'importmap.client',
    },
    server: {
      entry: 'entry.server',
      routemap: 'routemap.server',
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
    .object({
      basePathname: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.filesystemRouting.basePathname),
      dir: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.filesystemRouting.dir),
      enabled: z
        .boolean()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.filesystemRouting.enabled),
      overridePathname: z
        .function()
        .args(
          z.string(),
          z.object({
            pathname: z.string(),
            source: z.string(),
            name: z.string(),
            type: z.union([
              z.literal('route'),
              z.literal('fallback'),
              z.literal('layout'),
              z.literal('middleware'),
            ]),
            ext: z.string(),
          })
        )
        .returns(z.string())
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.filesystemRouting.overridePathname),
    })
    .optional()
    .default({}),
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
  const setRealPath = (ctx: any, key: string) =>
    // eslint-disable-next-line no-param-reassign
    (ctx[key] = resolveRealFile(ctx[key], root, extensions));

  setRealPath(builderConfig.filesystemRouting, 'dir');
  setRealPath(builderConfig.input.client, 'entry');
  setRealPath(builderConfig.input.client, 'importmap');
  setRealPath(builderConfig.input.server, 'entry');
  setRealPath(builderConfig.input.server, 'routemap');

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
