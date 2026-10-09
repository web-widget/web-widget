import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { WEB_ROUTER_CONFIG_DEFAULTS } from '@/internal/config';

jest.unstable_mockModule('vite', () => ({
  defaultClientConditions: ['browser'],
  isRunnableDevEnvironment: () => false,
  isCSSRequest: () => false,
  normalizePath: (value: string) => value.replace(/\\/g, '/'),
}));

const { createRouterPlugins } = await import('./index');

describe('client build graph entries', () => {
  let root = '';

  afterEach(async () => {
    if (root) {
      await fs.rm(root, { recursive: true, force: true });
      root = '';
    }
  });

  test.each([false, true])(
    'emits entries discovered after the client input snapshot (existing name: %p)',
    async (existingName) => {
      root = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-client-graph-'));
      const routePath = path.join(root, 'routes/page@route.tsx');
      const cssPath = path.join(root, 'styles/theme.css');
      const widgetPath = path.join(root, 'widgets/Counter@widget.tsx');
      const routemapPath = path.join(root, 'routemap.server.json');
      await fs.mkdir(path.dirname(routePath), { recursive: true });
      await fs.mkdir(path.dirname(cssPath), { recursive: true });
      await fs.mkdir(path.dirname(widgetPath), { recursive: true });
      await fs.writeFile(
        routePath,
        [
          "import '@styles/theme.css';",
          "import Counter from '@widgets/Counter@widget.tsx';",
          'export default Counter;',
        ].join('\n')
      );
      await fs.writeFile(cssPath, '.theme {}');
      await fs.writeFile(widgetPath, 'export default function Counter() {}');

      const router = createRouterPlugins()[0]!;
      const state = (router as any).api.build;
      const oldCssPath = path.join(root, 'old/theme.css');
      Object.assign(state, {
        root,
        dev: false,
        clientBuildGraphContext: {
          serverRoutemap: {
            routes: [{ pathname: '/', module: './routes/page@route.tsx' }],
            actions: [],
            middlewares: [],
            fallbacks: [],
          },
          serverRoutemapPath: routemapPath,
        },
        clientRoutemapEntryPoints: {
          points: existingName ? { 'styles.theme': oldCssPath } : {},
          exposures: new Set(),
        },
        serverRoutemapEntryPoints: { points: {}, exposures: new Set() },
        clientImportmap: {},
        resolvedWebRouterConfig: {
          ...WEB_ROUTER_CONFIG_DEFAULTS,
          input: {
            client: {
              entry: path.join(root, 'entry.client.ts'),
              importmap: '',
            },
            server: {
              entry: path.join(root, 'entry.server.ts'),
              routemap: routemapPath,
            },
          },
          output: {
            dir: path.join(root, 'dist'),
            client: 'client',
            server: 'server',
          },
        },
        serverTarget: 'node',
      });

      const environmentOptions = await (router.configEnvironment as Function)(
        'client',
        { build: {} },
        { command: 'build', isSsrBuild: false }
      );
      const input = environmentOptions.build.rolldownOptions.input;
      expect(input['styles.theme']).toBe(existingName ? oldCssPath : undefined);
      expect(input['widgets.Counter@widget.tsx']).toBeUndefined();

      const emitFile = jest.fn();
      const buildStart = router.buildStart as Function;
      const resolve = async (specifier: string) => ({
        id: specifier.startsWith('@styles') ? cssPath : widgetPath,
      });
      await buildStart.call({
        environment: { config: { consumer: 'server' } },
        resolve,
        emitFile,
      });
      expect(emitFile).not.toHaveBeenCalled();
      await buildStart.call({
        environment: { config: { consumer: 'client' } },
        resolve,
        emitFile,
      });

      expect(emitFile).toHaveBeenCalledWith({
        type: 'chunk',
        id: cssPath,
        name: existingName ? 'styles.theme.css' : 'styles.theme',
        preserveSignature: 'allow-extension',
      });
      expect(emitFile).toHaveBeenCalledWith({
        type: 'chunk',
        id: widgetPath,
        name: 'widgets.Counter@widget.tsx',
        preserveSignature: 'allow-extension',
      });
    }
  );
});
