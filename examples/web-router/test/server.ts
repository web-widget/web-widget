import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const MONOREPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

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
  const request = (pathname: string, options?: RequestInit) => {
    const res = fetch(`http://localhost:${port}${pathname}`, options).then(
      (res) => {
        const text = res.text;
        res.text = async () => {
          const t = await text.call(res);
          // NOTE: Replace monorepo root with a placeholder to make the snapshot stable.
          return t.replaceAll(MONOREPO_ROOT, '#TEST_MONOREPO_ROOT#');
        };
        return res;
      }
    );
    return res;
  };

  return { close, request };
}
