import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';
import { readFile } from 'node:fs/promises';
import type { ViteDevServer } from 'vite';

const serverBuild = process.env.BUILD_TARGET === 'server';

function frameworkSSRPlugin(): Plugin {
  let devServer: ViteDevServer | undefined;
  return {
    name: 'integration-framework-ssr',
    configureServer(server) {
      devServer = server;
    },
    async transformIndexHtml(html) {
      if (!devServer) return html;
      const module = await devServer.ssrLoadModule('/src/framework-ssr.ts');
      const fragments = await module.renderFrameworkSSR();
      return module.injectFrameworkSSR(html, fragments);
    },
  };
}

function integrationControlPlugin(): Plugin {
  const versions = new Map<string, number>();
  let moduleVersion = 0;
  let appVersion = 0;
  let root = process.cwd();

  return {
    name: 'integration-control',
    configureServer(server) {
      root = server.config.root;
      server.watcher.on('change', (file) => {
        const relative = path.relative(root, file).split(path.sep).join('/');
        versions.set(relative, (versions.get(relative) ?? 0) + 1);
        if (file.endsWith('.module.css')) moduleVersion++;
        if (relative.startsWith('src/')) appVersion++;
      });
      server.middlewares.use('/__integration/health', (_request, response) => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ ready: true }));
      });
      server.middlewares.use('/__integration/watcher', (request, response) => {
        const url = new URL(request.url ?? '/', 'http://integration.test');
        const file = url.searchParams.get('file') ?? '';
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ version: versions.get(file) ?? 0 }));
      });
      server.middlewares.use(
        '/__integration/module-version',
        (_request, response) => {
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ version: moduleVersion }));
        }
      );
      server.middlewares.use(
        '/__integration/app-version',
        (_request, response) => {
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ version: appVersion }));
        }
      );
    },
    transformIndexHtml(html) {
      return html
        .replace('__MODULE_VERSION__', String(moduleVersion))
        .replaceAll('__APP_VERSION__', String(appVersion));
    },
    transform(code, id) {
      if (id.includes('/src/entry.client.ts')) {
        return code.replace('__CLIENT_APP_VERSION__', String(appVersion));
      }
      return;
    },
  };
}

function stableVueScopePlugin(): Plugin {
  return {
    name: 'integration-stable-vue-scope',
    enforce: 'post',
    transform(code, id) {
      if (!id.includes('/cases/vue/VueMatrix.vue')) return;
      return code.replaceAll(/data-v-[a-f0-9]{8}/g, 'data-v-vue-matrix');
    },
    generateBundle(_options, bundle) {
      for (const entry of Object.values(bundle)) {
        if (entry.type === 'chunk') {
          entry.code = entry.code.replaceAll(
            /data-v-[a-f0-9]{8}/g,
            'data-v-vue-matrix'
          );
        } else {
          entry.source = String(entry.source).replaceAll(
            /data-v-[a-f0-9]{8}/g,
            'data-v-vue-matrix'
          );
        }
      }
    },
  };
}

function updatePolicyPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: 'integration-update-policy',
    configResolved(config) {
      root = config.root;
    },
    async transformIndexHtml(html) {
      const serverVersion = await readFile(
        path.join(root, 'src/server-only-route.ts'),
        'utf8'
      );
      const routeStructure = JSON.parse(
        await readFile(path.join(root, 'src/route-structure.json'), 'utf8')
      ) as { route: string };
      const version = serverVersion.match(/ROUTE_VERSION = '([^']+)'/)?.[1];
      const routeModule = await readFile(
        path.join(root, 'src/cases/route/route.module.css'),
        'utf8'
      );
      const moduleClass = routeModule.match(/\.([\w-]+)\s*\{/)?.[1];
      const reactWidget = await readFile(
        path.join(root, 'src/hydration/ReactWidget.tsx'),
        'utf8'
      );
      const reactLabel = reactWidget.includes('Updated React {count}')
        ? 'Updated React'
        : 'React';
      return html
        .replace('__SERVER_VERSION__', version ?? 'unknown')
        .replaceAll('__ROUTE_STRUCTURE__', routeStructure.route)
        .replace(
          '__ROUTE_MODULE_CLASS__',
          `ww_route_${moduleClass ?? 'missing'}`
        )
        .replace('__REACT_LABEL__', reactLabel);
    },
    hotUpdate({ file, server }) {
      if (
        file.endsWith('.module.css') ||
        file.endsWith('/server-only-route.ts') ||
        file.endsWith('/route-structure.json')
      ) {
        server.environments.client.hot.send({ type: 'full-reload' });
        return [];
      }
      return;
    },
  };
}

export default defineConfig({
  build: serverBuild
    ? {
        emptyOutDir: false,
        outDir: 'dist/server',
        ssr: 'src/entry.server.ts',
      }
    : {
        outDir: 'dist/client',
      },
  resolve: {
    alias: {
      '@cases': path.resolve(import.meta.dirname, 'src/cases'),
    },
  },
  css: {
    modules: {
      generateScopedName(name, filename) {
        const basename = path.basename(filename, '.module.css');
        return `ww_${basename}_${name}`;
      },
    },
  },
  plugins: serverBuild
    ? [
        solid({
          include: /SolidWidget\.tsx\?solid-ssr$/,
          ssr: true,
          solid: { hydratable: true },
        }),
        svelte(),
      ]
    : [
        react({ exclude: /SolidWidget\.tsx$/ }),
        solid({
          include: /SolidWidget\.tsx$/,
          solid: { hydratable: true },
        }),
        solid({
          include: /SolidWidget\.tsx\?solid-ssr$/,
          ssr: true,
          solid: { hydratable: true },
        }),
        svelte(),
        vue(),
        frameworkSSRPlugin(),
        stableVueScopePlugin(),
        updatePolicyPlugin(),
        integrationControlPlugin(),
      ],
});
