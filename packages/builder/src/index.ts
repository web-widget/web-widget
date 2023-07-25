import type { BuilderUserConfig } from "./types";
export type * from "./types";

export function defineConfig(config: BuilderUserConfig): BuilderUserConfig {
  return config;
}
