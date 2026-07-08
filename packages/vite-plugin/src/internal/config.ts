import path from 'node:path';
import { z } from 'zod';
import { defaultFileExistsSync, type FileExistsSync } from './io';
import {
  requireConventionEntry,
  resolveLogicalConfigPath,
} from './ensure-convention-files';
import type { ResolvedWebRouterConfig, WebRouterUserConfig } from '@/types';

export function resolveRealFile(
  fileName: string,
  root: string,
  extensions: string[] = [
    '.mjs',
    '.js',
    '.mts',
    '.ts',
    '.jsx',
    '.tsx',
    '.vue',
    '.json',
  ],
  fileExists: FileExistsSync = defaultFileExistsSync
): string {
  const paths = ['', ...extensions].map((extension) =>
    path.resolve(root, `${fileName}${extension}`)
  );

  for (const file of paths) {
    if (fileExists(file)) {
      return file;
    }
  }

  throw new Error(`File not found: ${paths.join(', ')}`);
}

function resolveRoutesDir(
  root: string,
  dir: string,
  filesystemRoutingEnabled: boolean,
  extensions: string[] | undefined,
  fileExists: FileExistsSync
): string {
  if (filesystemRoutingEnabled) {
    return resolveLogicalConfigPath(root, dir);
  }

  return resolveRealFile(dir, root, extensions, fileExists);
}

////////////////////////////////////////
//////                            //////
//////       WebRouterPlugin      //////
//////                            //////
////////////////////////////////////////

export const WEB_ROUTER_CONFIG_DEFAULTS: ResolvedWebRouterConfig = {
  ignore: [
    'node_modules',
    'dist',
    'build',
    'out',
    'coverage',
    '.git',
    '.cache',
    '.vite',
    '.turbo',
  ],
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
    overridePathname: (pathname) => pathname,
  },
  importShim: {
    enabled: false,
    url: 'https://ga.jspm.io/npm:es-module-shims@2.8.2/dist/es-module-shims.js',
  },
  css: {
    inlineStrategy: 'auto',
    inlineThreshold: 8192,
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
    server: 'server',
  },
};

export const WebRouterConfigSchema = z.object({
  ignore: z
    .array(z.string())
    .optional()
    .default(WEB_ROUTER_CONFIG_DEFAULTS.ignore),
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
              z.literal('route'),
              z.literal('fallback'),
              z.literal('layout'),
              z.literal('middleware'),
              z.literal('action'),
            ]),
            ext: z.string(),
          })
        )
        .returns(z.string())
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.filesystemRouting.overridePathname),
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
  css: z
    .object({
      inlineStrategy: z
        .enum(['auto', 'always', 'never'])
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.css.inlineStrategy),
      inlineThreshold: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(WEB_ROUTER_CONFIG_DEFAULTS.css.inlineThreshold),
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
  extensions?: string[],
  fileExists: FileExistsSync = defaultFileExistsSync
) {
  const builderConfig = WebRouterConfigSchema.parse(
    userConfig
  ) as ResolvedWebRouterConfig;
  const entryExtensions = extensions ?? [
    '.mjs',
    '.js',
    '.mts',
    '.ts',
    '.jsx',
    '.tsx',
    '.vue',
    '.json',
  ];

  builderConfig.input.client.entry = requireConventionEntry(
    'entry.client',
    builderConfig.input.client.entry,
    root,
    entryExtensions,
    fileExists
  );
  builderConfig.input.server.entry = requireConventionEntry(
    'entry.server',
    builderConfig.input.server.entry,
    root,
    entryExtensions,
    fileExists
  );
  builderConfig.input.client.importmap = resolveLogicalConfigPath(
    root,
    builderConfig.input.client.importmap
  );
  builderConfig.input.server.routemap = resolveLogicalConfigPath(
    root,
    builderConfig.input.server.routemap
  );
  builderConfig.filesystemRouting.dir = resolveRoutesDir(
    root,
    builderConfig.filesystemRouting.dir,
    builderConfig.filesystemRouting.enabled,
    entryExtensions,
    fileExists
  );

  return builderConfig;
}
