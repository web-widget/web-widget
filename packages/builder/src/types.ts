import type { BuilderConfigSchema } from "./config/schema";
import type { OutgoingHttpHeaders } from "node:http";
import type { UserConfig as ViteConfig } from "vite";
import type { z } from "zod";

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

export { ViteConfig };

export interface BuilderUserConfig {
  base?: string;
  cacheDir?: string;
  publicDir?: string;
  tempDir?: string;
  root?: string;
  input?: string;
  output?: Output;
  server?: Server | ((options: { command: "dev" | "preview" }) => Server);
  vite?: ViteConfig;
}

export interface BuilderConfig extends z.output<typeof BuilderConfigSchema> {}
