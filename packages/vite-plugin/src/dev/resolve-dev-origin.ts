import type { ResolvedServerOptions, ViteDevServer } from 'vite';

type ViteServerWithUrls = Pick<ViteDevServer, 'config' | 'resolvedUrls'>;

function resolveOriginFromServerOptions(
  options: Pick<ResolvedServerOptions, 'https' | 'host' | 'port'>,
  defaultPort: number
): string {
  const { ORIGIN } = process.env;
  if (ORIGIN) {
    return ORIGIN;
  }

  const protocol = options.https ? 'https' : 'http';
  const host =
    options.host === true
      ? 'localhost'
      : typeof options.host === 'string'
        ? options.host
        : 'localhost';
  const port = options.port ?? defaultPort;

  return `${protocol}://${host}:${port}`;
}

/**
 * Resolve the public origin for dev server requests.
 * Mirrors Vite's own URL resolution: server.origin → resolvedUrls → server.* fallback.
 */
export function resolveDevOrigin(viteServer: ViteDevServer): string {
  const { server } = viteServer.config;

  if (server.origin) {
    return new URL(server.origin).origin;
  }

  const resolvedUrl =
    viteServer.resolvedUrls?.local[0] ?? viteServer.resolvedUrls?.network[0];
  if (resolvedUrl) {
    return new URL(resolvedUrl).origin;
  }

  return resolveOriginFromServerOptions(server, 5173);
}

export function resolvePreviewOrigin(server: ViteServerWithUrls): string {
  const { preview } = server.config;

  const resolvedUrl =
    server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
  if (resolvedUrl) {
    return new URL(resolvedUrl).origin;
  }

  return resolveOriginFromServerOptions(preview, 4173);
}
