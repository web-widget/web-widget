import type { BuilderUserConfig } from "./types";
export type * from "./types";
export * from "./web-widget";

export function defineConfig(config: BuilderUserConfig): BuilderUserConfig {
  return config;
}
