import type { BuilderUserConfig, BuilderConfig } from "../types";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mergeConfig as mergeViteConfig } from "vite";
import { createRelativeSchema } from "./schema";
import { loadConfigWithVite } from "./vite-load";

/** Wraps an object in an array. If an array is passed, ignore it. */
function arraify<T>(target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target];
}

/** Returns true if argument is an object of any prototype/class (but not null). */
function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value != null;
}

/** Cross-realm compatible URL */
function isURL(value: unknown): value is URL {
  return Object.prototype.toString.call(value) === "[object URL]";
}

/** Turn raw config values into normalized values */
export async function validateConfig(
  userConfig: any,
  root: string,
  cmd: string
): Promise<BuilderConfig> {
  const fileProtocolRoot = pathToFileURL(root + path.sep);

  const BuilderConfigRelativeSchema = createRelativeSchema(
    cmd,
    fileProtocolRoot
  );

  // First-Pass Validation
  const result = await BuilderConfigRelativeSchema.parseAsync(userConfig);

  // If successful, return the result as a verified BuilderConfig object.
  return result;
}

export function resolveRoot(cwd?: string | URL): string {
  if (cwd instanceof URL) {
    cwd = fileURLToPath(cwd);
  }
  return cwd ? path.resolve(cwd) : process.cwd();
}

async function search(fsMod: typeof fs, root: string) {
  const paths = [
    "builder.config.mjs",
    "builder.config.js",
    "builder.config.ts",
    "builder.config.mts",
    "builder.config.cjs",
    "builder.config.cts",
  ].map((p) => path.join(root, p));

  for (const file of paths) {
    if (fsMod.existsSync(file)) {
      return file;
    }
  }
}

interface LoadConfigOptions {
  cwd?: string;
  cmd: string;
  validate?: boolean;
  /** Invalidate when reloading a previously loaded config */
  isRestart?: boolean;
  fsMod?: typeof fs;
}

interface ResolveConfigPathOptions {
  cwd?: string;
  fs: typeof fs;
}

/**
 * Resolve the file URL of the user's `builder.config.js|cjs|mjs|ts` file
 */
export async function resolveConfigPath(
  configOptions: ResolveConfigPathOptions
): Promise<string | undefined> {
  const root = resolveRoot(configOptions.cwd);

  let userConfigPath: string | undefined;
  userConfigPath = await search(configOptions.fs, root);

  return userConfigPath;
}

interface OpenConfigResult {
  userConfig: BuilderUserConfig;
  builderConfig: BuilderConfig;
  root: string;
}

/** Load a configuration file, returning both the userConfig and astroConfig */
export async function openConfig(
  configOptions: LoadConfigOptions
): Promise<OpenConfigResult> {
  const root = resolveRoot(configOptions.cwd);
  let userConfig: BuilderUserConfig = {};

  const config = await tryLoadConfig(configOptions, root);
  if (config) {
    userConfig = config.content;
  }
  const builderConfig = await resolveConfig(
    userConfig,
    root,
    configOptions.cmd
  );

  return {
    builderConfig,
    userConfig,
    root,
  };
}

interface TryLoadConfigResult {
  content: Record<string, any>;
  filePath?: string;
}

async function tryLoadConfig(
  configOptions: LoadConfigOptions,
  root: string
): Promise<TryLoadConfigResult | undefined> {
  const fsMod = configOptions.fsMod ?? fs;
  let finallyCleanup = async () => {};
  try {
    let configPath = await resolveConfigPath({
      cwd: configOptions.cwd,
      fs: fsMod,
    });
    if (!configPath) return undefined;
    if (configOptions.isRestart) {
      // Hack: Write config to temporary file at project root
      // This invalidates and reloads file contents when using ESM imports or "resolve"
      const tempConfigPath = path.join(
        root,
        `.temp.${Date.now()}.config${path.extname(configPath)}`
      );

      const currentConfigContent = await fsMod.promises.readFile(
        configPath,
        "utf-8"
      );
      await fs.promises.writeFile(tempConfigPath, currentConfigContent);
      finallyCleanup = async () => {
        try {
          await fs.promises.unlink(tempConfigPath);
        } catch {
          /** file already removed */
        }
      };
      configPath = tempConfigPath;
    }

    // Create a vite server to load the config
    const config = await loadConfigWithVite(configPath);
    return config as TryLoadConfigResult;
  } finally {
    await finallyCleanup();
  }
}

/** Attempt to resolve an Astro configuration object. Normalize, validate, and return. */
export async function resolveConfig(
  userConfig: BuilderUserConfig,
  root: string,
  cmd: string
): Promise<BuilderConfig> {
  const validatedConfig = await validateConfig(userConfig, root, cmd);

  return validatedConfig;
}

export function createDefaultDevConfig(
  userConfig: BuilderUserConfig = {},
  root: string = process.cwd()
) {
  return resolveConfig(userConfig, root, "dev");
}

function mergeConfigRecursively(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  rootPath: string
) {
  const merged: Record<string, any> = { ...defaults };
  for (const key in overrides) {
    const value = overrides[key];
    if (value == null) {
      continue;
    }

    const existing = merged[key];

    if (existing == null) {
      merged[key] = value;
      continue;
    }

    // fields that require special handling:
    if (key === "viteConfig" && rootPath === "") {
      merged[key] = mergeViteConfig(existing, value);
      continue;
    }

    if (Array.isArray(existing) || Array.isArray(value)) {
      merged[key] = [...arraify(existing ?? []), ...arraify(value ?? [])];
      continue;
    }
    if (isURL(existing) && isURL(value)) {
      merged[key] = value;
      continue;
    }
    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigRecursively(
        existing,
        value,
        rootPath ? `${rootPath}.${key}` : key
      );
      continue;
    }

    merged[key] = value;
  }
  return merged;
}

export function mergeConfig(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  isRoot = true
): Record<string, any> {
  return mergeConfigRecursively(defaults, overrides, isRoot ? "" : ".");
}
