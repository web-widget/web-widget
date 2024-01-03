import type WebRouter from "@web-widget/web-router";
import type { z } from "zod";
import type { BuilderConfigSchema } from "./config";
import type { Manifest, StartOptions } from "@web-widget/web-router";

export interface Input {
  routes: {
    // enabled: boolean;
    dir: string;
    basePathname: string;
    trailingSlash: boolean;
  };
  client: {
    entry: string;
    importmap: string;
  };
  server: {
    entry: string;
    routemap: string;
  };
}

export interface Output {
  client: string;
  dir: string;
  manifest: string;
  server: string;
  ssrManifest: string;
}

export interface ResolvedBuilderConfig {
  autoFullBuild: boolean;
  filesystemRouting: boolean;
  input: Input;
  output: Output;
}

export type BuilderUserConfig = Partial<ResolvedBuilderConfig>;

export interface BuilderConfig extends z.output<typeof BuilderConfigSchema> {}

export interface ServerEntryModule {
  default: (manifest: Manifest, options: StartOptions) => WebRouter;
}

export interface ClientEntryModule {}
