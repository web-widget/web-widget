import type { ViteDevServer } from "vite";
import { createServer } from "vite";
import { pathToFileURL } from "url";

async function createViteServer() {
  const viteServer = await createServer({
    server: { middlewareMode: true, hmr: false, watch: { ignored: ["**"] } },
    optimizeDeps: { disabled: true },
    clearScreen: false,
    appType: "custom",
    ssr: {
      external: [],
    },
    plugins: [],
  });

  return viteServer;
}

export async function loadConfigWithVite(
  configPath: string | undefined
): Promise<{
  content: Record<string, any>;
  filePath?: string;
}> {
  // No config file found, return an empty config that will be populated with defaults
  if (!configPath) {
    return {
      content: {},
      filePath: undefined,
    };
  }

  // Try loading with Node import()
  if (/\.[cm]?js$/.test(configPath)) {
    try {
      const config = await import(pathToFileURL(configPath).toString());
      return {
        content: config.default ?? {},
        filePath: configPath,
      };
    } catch {
      // We do not need to keep the error here because with fallback the error will be rethrown
      // when/if it fails in Vite.
    }
  }

  // Try Loading with Vite
  let loader: ViteDevServer | undefined;
  try {
    loader = await createViteServer();
    const mod = await loader.ssrLoadModule(configPath);
    return {
      content: mod.default ?? {},
      filePath: configPath,
    };
  } finally {
    if (loader) {
      await loader.close();
    }
  }
}
