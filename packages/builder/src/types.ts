import type { UserConfig as ViteOptions } from "vite";
import type { z } from "zod";
import type { OutgoingHttpHeaders } from "node:http";
import { BuilderConfigSchema } from "./config/schema";

export interface Input {
  routes?: {
    name: string;
    pathname: string;
    module: string;
  }[];
  middlewares?: {
    pathname: string;
    module: string;
  }[];
  notFound?: {
    name: string;
    pathname: string;
    module: string;
  };
  error?: {
    name: string;
    pathname: string;
    module: string;
  };
}

export interface Output {
  dir?: string;
  client?: string;
  server?: string;
  assets?: string;
  assetsPrefix?: string;
  serverEntry?: string;
}

export interface Server {
  host?: string | boolean;
  port?: number;
  headers?: OutgoingHttpHeaders;
}

export { ViteOptions };

export interface BuilderUserConfig {
  base?: string;
  cacheDir?: string;
  publicDir?: string;
  tempDir?: string;
  root?: string;
  input?: Input;
  output?: Output;
  server?: Server | ((options: { command: "dev" | "preview" }) => Server);
  viteOptions?: ViteOptions;
}

export interface BuilderConfig extends z.output<typeof BuilderConfigSchema> {}

export interface WidgetDefinition {
  id: string;
  placeholder: string;
  file: string;
  importerFile: string;
  entryFilename?: string;
}