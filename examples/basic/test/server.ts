import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { findWorkspaceDir } from '@pnpm/find-workspace-dir';

export type Server = {
  close: () => Promise<void>;
  fetch: (pathname: string, options?: RequestInit) => Promise<Response>;
};

export async function createTestServer(): Promise<Server> {
  const workspaceDir =
    (await findWorkspaceDir(process.cwd())) ||
    fileURLToPath(new URL('../', import.meta.url));
  const port = 51204;
  const viteDevServer = await createServer({
    server: {
      port,
    },
  });

  await viteDevServer.listen();

  viteDevServer.printUrls();
  viteDevServer.bindCLIShortcuts({ print: true });

  return {
    close() {
      return viteDevServer.close();
    },

    async fetch(pathname: string, options?: RequestInit) {
      const response = await fetch(
        `http://localhost:${port}${pathname}`,
        options
      );

      const res = new Response(response.body, response);
      const text = res.text;

      // NOTE: Remove date to make the snapshot stable.
      res.headers.delete('date');
      res.text = async () => {
        const t = await text.call(res);
        // NOTE: Replace monorepo root with a placeholder to make the snapshot stable.
        return t.replaceAll(workspaceDir, '#TEST_WORKSPACE_DIR#');
      };

      return res;
    },
  };
}
