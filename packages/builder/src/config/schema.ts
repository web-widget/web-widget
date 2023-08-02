import type { BuilderUserConfig, ViteConfig } from "../types";

import type { OutgoingHttpHeaders } from "node:http";
import { z } from "zod";

const BUILDER_CONFIG_DEFAULTS: BuilderUserConfig & any = {
  base: "/",
  cacheDir: "./node_modules/.builder",
  publicDir: "./public",
  root: ".",
  input: "./routemap.json",
  output: {
    dir: "./dist",
    client: "client",
    server: "server",
    asset: "assets",
    manifest: "manifest.js",
  },
  server: {
    host: false,
    port: 3000,
  },
  vite: {},
};

export const BuilderConfigSchema = z.object({
  base: z.string().optional().default(BUILDER_CONFIG_DEFAULTS.base),
  cacheDir: z
    .string()
    .optional()
    .default(BUILDER_CONFIG_DEFAULTS.cacheDir)
    .transform((val) => new URL(val)),
  publicDir: z
    .string()
    .optional()
    .default(BUILDER_CONFIG_DEFAULTS.publicDir)
    .transform((val) => new URL(val)),
  root: z
    .string()
    .optional()
    .default(BUILDER_CONFIG_DEFAULTS.root)
    .transform((val) => new URL(val)),
  input: z
    .string()
    .optional()
    .default(BUILDER_CONFIG_DEFAULTS.input)
    .transform((val) => new URL(val)),
  output: z
    .object({
      dir: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.dir)
        .transform((val) => new URL(val)),
      client: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.client)
        .transform((val) => new URL(val)),
      server: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.server)
        .transform((val) => new URL(val)),
      asset: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.asset),
      assetsPrefix: z.string().optional(),
      manifest: z
        .string()
        .optional()
        .default(BUILDER_CONFIG_DEFAULTS.output.manifest),
    })
    .optional()
    .default({}),
  server: z.preprocess(
    // preprocess
    // NOTE: Uses the "error" command here because this is overwritten by the
    // individualized schema parser with the correct command.
    (val) => (typeof val === "function" ? val({ command: "error" }) : val),
    z
      .object({
        host: z
          .union([z.string(), z.boolean()])
          .optional()
          .default(BUILDER_CONFIG_DEFAULTS.server.host),
        port: z
          .number()
          .optional()
          .default(BUILDER_CONFIG_DEFAULTS.server.port),
        headers: z.custom<OutgoingHttpHeaders>().optional(),
      })
      .optional()
      .default({})
  ),
  vite: z
    .custom<ViteConfig>(
      (data: any) => data instanceof Object && !Array.isArray(data)
    )
    .default(BUILDER_CONFIG_DEFAULTS.vite),
});

function appendForwardSlash(path: string) {
  return path.endsWith("/") ? path : path + "/";
}

function trimSlashes(path: string) {
  return path.replace(/^\/|\/$/g, "");
}

// function prependForwardSlash(path: string) {
//   return path[0] === "/" ? path : "/" + path;
// }

export function createRelativeSchema(cmd: string, fileProtocolRoot: URL) {
  // We need to extend the global schema to add transforms that are relative to root.
  // This is type checked against the global schema to make sure we still match.
  const BuilderConfigRelativeSchema = BuilderConfigSchema.extend({
    cacheDir: z
      .string()
      .default(BUILDER_CONFIG_DEFAULTS.cacheDir)
      .transform((val) => new URL(appendForwardSlash(val), fileProtocolRoot)),
    publicDir: z
      .string()
      .default(BUILDER_CONFIG_DEFAULTS.publicDir)
      .transform((val) => new URL(appendForwardSlash(val), fileProtocolRoot)),
    root: z
      .string()
      .default(BUILDER_CONFIG_DEFAULTS.root)
      .transform((val) => new URL(appendForwardSlash(val), fileProtocolRoot)),
    input: z
      .string()
      .default(BUILDER_CONFIG_DEFAULTS.input)
      .transform((val) => new URL(val, fileProtocolRoot)),
    output: z
      .object({
        dir: z
          .string()
          .optional()
          .default(BUILDER_CONFIG_DEFAULTS.output.dir)
          .transform(
            (val) => new URL(appendForwardSlash(val), fileProtocolRoot)
          ),
        client: z
          .string()
          .optional()
          .default(
            BUILDER_CONFIG_DEFAULTS.output.client
          ) as unknown as z.ZodEffects<
          z.ZodDefault<z.ZodOptional<z.ZodString>>,
          URL
        >,
        server: z
          .string()
          .optional()
          .default(
            BUILDER_CONFIG_DEFAULTS.output.server
          ) as unknown as z.ZodEffects<
          z.ZodDefault<z.ZodOptional<z.ZodString>>,
          URL
        >,
        asset: z
          .string()
          .optional()
          .default(BUILDER_CONFIG_DEFAULTS.output.asset),
        assetsPrefix: z.string().optional(),
        manifest: z
          .string()
          .optional()
          .default(BUILDER_CONFIG_DEFAULTS.output.manifest),
      })
      .optional()
      .default({}),
    server: z.preprocess(
      (val) => {
        if (typeof val === "function") {
          const result = val({ command: cmd === "dev" ? "dev" : "preview" });
          // @ts-expect-error revive attached prop added from CLI flags
          if (val.port) result.port = val.port;
          // @ts-expect-error revive attached prop added from CLI flags
          if (val.host) result.host = val.host;
          return result;
        } else {
          return val;
        }
      },
      z
        .object({
          host: z
            .union([z.string(), z.boolean()])
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.server.host),
          port: z
            .number()
            .optional()
            .default(BUILDER_CONFIG_DEFAULTS.server.port),
          headers: z.custom<OutgoingHttpHeaders>().optional(),
        })
        .optional()
        .default({})
    ),
  }).transform((config) => {
    const trimmedBase = trimSlashes(config.base);
    config.output.server = new URL(config.output.server, config.output.dir);
    config.output.client = new URL(config.output.client, config.output.dir);
    // config.base = prependForwardSlash(appendForwardSlash(trimmedBase));
    config.base = appendForwardSlash(trimmedBase);

    return config;
  });

  return BuilderConfigRelativeSchema;
}
