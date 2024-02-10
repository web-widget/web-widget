import { createServer } from 'vite';

export type Server = {
  close: () => Promise<void>;
  request: (pathname: string, options?: RequestInit) => Promise<Response>;
};

export async function createTestServer(): Promise<Server> {
  const port = 51204;
  const viteDevServer = await createServer({
    server: {
      port,
    },
  });

  await viteDevServer.listen();

  viteDevServer.printUrls();
  viteDevServer.bindCLIShortcuts({ print: true });

  const close = () => viteDevServer.close();
  const request = (pathname: string, options?: RequestInit) =>
    fetch(`http://localhost:${port}${pathname}`, options);

  return { close, request };
}
