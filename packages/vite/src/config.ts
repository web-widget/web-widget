import { z } from "zod";
import type { BuilderUserConfig, ResolvedBuilderConfig } from "./types";

export const BUILDER_CONFIG_DEFAULTS: ResolvedBuilderConfig = {
  autoFullBuild: true,
  filesystemRouting: false,
  input: {
    client: {
      entry: "entry.client",
      importmap: "importmap.client.json",
    },
    server: {
      entry: "entry.server",
      routemap: "routemap.server",
    },
    routes: {
      dir: "routes",
      basePathname: "/",
      trailingSlash: false,
    },
  },
  output: {
    client: "client",
    dir: "dist",
    manifest: "manifest.json",
    server: "server",
    ssrManifest: "ssr-manifest.json",
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
          dir: z
            .string()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.input.routes.dir),
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

export function parseConfig(userConfig: BuilderUserConfig) {
  return BuilderConfigSchema.parse(userConfig) as ResolvedBuilderConfig;
}

export function setConfig(config: ResolvedBuilderConfig) {
  resolve(config);
}

export function getConfig(): Promise<ResolvedBuilderConfig> {
  return config as Promise<ResolvedBuilderConfig>;
}
