import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { ResolvedWebRouterConfig, WebRouterUserConfig } from './types';

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

////////////////////////////////////////
//////                            //////
//////       WebRouterPlugin      //////
//////                            //////
////////////////////////////////////////

export const WEB_ROUTER_CONFIG_DEFAULTS: ResolvedWebRouterConfig = {
  autoFullBuild: true,
  asyncContext: {
    enabled: true,
  },
  serverAction: {
    enabled: false,
  },
  filesystemRouting: {
    basePathname: '/',
    dir: 'routes',
    enabled: false,
    overridePathname: undefined,
    rewrite: undefined,
  },
  importShim: {
    enabled: false,
    url: 'https://ga.jspm.io/npm:es-module-shims@1.10.0/dist/es-module-shims.js',
  },
  input: {
    client: {
      entry: 'entry.client',
      importmap: 'importmap.client.json',
    },
    server: {
      entry: 'entry.server',
      routemap: 'routemap.server.json',
    },
  },
  output: {
    client: 'client',
    dir: 'dist',
    manifest: '.manifest.json',
    server: 'server',
  },
};

export const WebRouterConfigSchema = z.object({
  autoFullBuild: z
    .boolean()
    .optional()
    .default(WEB_ROUTER_CONFIG_DEFAULTS.autoFullBuild),
  asyncContext: z
    .object({
      enabled: z
        .boolean()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.asyncContext.enabled),
    })
    .optional()
    .default({}),
  serverAction: z
    .object({
      enabled: z
        .boolean()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.serverAction.enabled),
    })
    .optional()
    .default({}),
  filesystemRouting: z
    .object({
      basePathname: z
        .string()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.filesystemRouting.basePathname),
      dir: z
        .string()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.filesystemRouting.dir),
      enabled: z
        .boolean()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.filesystemRouting.enabled),
      overridePathname: z
        .function()
        .args(
          z.string(),
          z.object({
            pathname: z.string(),
            source: z.string(),
            name: z.string(),
            type: z.union([
              z.literal('action'),
              z.literal('route'),
              z.literal('fallback'),
              z.literal('layout'),
              z.literal('middleware'),
            ]),
            ext: z.string(),
          })
        )
        .returns(z.string())
        .optional(),
      rewrite: z
        .function()
        .args(
          z.object({
            username: z.string().optional(),
            password: z.string().optional(),
            protocol: z.string().optional(),
            hostname: z.string().optional(),
            port: z.string().optional(),
            pathname: z.string(),
            search: z.string().optional(),
            hash: z.string().optional(),
          }),
          z.object({
            pathname: z.string(),
            source: z.string(),
            name: z.string(),
            type: z.union([
              z.literal('action'),
              z.literal('route'),
              z.literal('fallback'),
              z.literal('layout'),
              z.literal('middleware'),
            ]),
            ext: z.string(),
          })
        )
        .returns(
          z.object({
            username: z.string().optional(),
            password: z.string().optional(),
            protocol: z.string().optional(),
            hostname: z.string().optional(),
            port: z.string().optional(),
            pathname: z.string(),
            search: z.string().optional(),
            hash: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional()
    .default({}),
  importShim: z
    .object({
      enabled: z
        .boolean()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.importShim.enabled),
      url: z
        .string()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.importShim.url),
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
            .default(WEB_ROUTER_CONFIG_DEFAULTS.input.client.entry),
          importmap: z
            .string()
            .optional()
            .default(WEB_ROUTER_CONFIG_DEFAULTS.input.client.importmap),
        })
        .optional()
        .default({}),
      server: z
        .object({
          entry: z
            .string()
            .optional()
            .default(WEB_ROUTER_CONFIG_DEFAULTS.input.server.entry),
          routemap: z
            .string()
            .optional()
            .default(WEB_ROUTER_CONFIG_DEFAULTS.input.server.routemap),
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
        .default(WEB_ROUTER_CONFIG_DEFAULTS.output.client),
      dir: z.string().optional().default(WEB_ROUTER_CONFIG_DEFAULTS.output.dir),
      manifest: z
        .string()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.output.manifest),
      server: z
        .string()
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.output.server),
    })
    .optional()
    .default({}),
});

export function parseWebRouterConfig(
  userConfig: WebRouterUserConfig,
  root: string,
  extensions?: string[]
) {
  const builderConfig = WebRouterConfigSchema.parse(
    userConfig
  ) as ResolvedWebRouterConfig;
  const setRealPath = (ctx: any, key: string) =>
    (ctx[key] = resolveRealFile(ctx[key], root, extensions));

  setRealPath(builderConfig.filesystemRouting, 'dir');
  setRealPath(builderConfig.input.client, 'entry');
  setRealPath(builderConfig.input.client, 'importmap');
  setRealPath(builderConfig.input.server, 'entry');
  setRealPath(builderConfig.input.server, 'routemap');

  return builderConfig;
}
