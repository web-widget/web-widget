import path from 'node:path';
import type { Plugin } from 'vite';
import type { Meta } from '@web-widget/helpers';
import { applyToServerEnvironment } from '@/internal/environment';
import { getLinks } from '@/internal/manifest-links';
import type { RouterPluginHost } from './host';
import {
  buildDevManifestCode,
  buildProdManifestCode,
} from '@/internal/routemap-manifest-code';
import {
  assembleServerEntryTransform,
  buildDevServerEntryMeta,
  SERVER_ENTRY_PLACEHOLDER,
} from '@/internal/server-entry-transform';
import { getManifest } from '@/internal/manifest';
import { normalizePath } from '@/internal/path';

const FRAMEWORK = '__import_meta_framework__';

export function createServerEntryPlugin(host: RouterPluginHost): Plugin {
  return {
    name: '@web-widget:server-entry',
    enforce: 'pre',
    sharedDuringBuild: true,
    applyToEnvironment: applyToServerEnvironment(),

    async configResolved(config) {
      host.patchState({
        dev: config.command === 'serve',
        base: config.base,
        root: config.root,
        sourcemap: !!config.build?.sourcemap,
      });
    },

    async transform(code, id) {
      const { dev, resolvedWebRouterConfig, root, base, sourcemap } =
        host.state;
      const api = host.api;
      const { entry, routemap } = resolvedWebRouterConfig.input.server;

      if (id !== entry || !code.includes(SERVER_ENTRY_PLACEHOLDER)) {
        return null;
      }

      let manifestCode: string;
      let metaCode: string;

      if (dev) {
        const routemapJson = await api.serverRoutemap();
        manifestCode = buildDevManifestCode({
          framework: FRAMEWORK,
          routemapJson,
          routemapPath: routemap,
        });
      } else {
        const routemapJson = await api.serverRoutemap();
        manifestCode = buildProdManifestCode({
          framework: FRAMEWORK,
          routemapJson,
        });
      }

      const entryFileName = normalizePath(
        path.relative(root, resolvedWebRouterConfig.input.client.entry)
      );

      if (dev) {
        metaCode = buildDevServerEntryMeta(FRAMEWORK, entryFileName);
      } else {
        const clientImportmapData = await api.clientImportmap();
        const viteManifest = await getManifest(root, resolvedWebRouterConfig);
        const asset = viteManifest[entryFileName];

        if (!asset) {
          throw new Error(`No client entry found.`);
        }

        const importShim = resolvedWebRouterConfig.importShim;
        const clientEntryModuleName = base + asset.file;
        const clientEntryLinks = getLinks(
          viteManifest,
          entryFileName,
          base,
          new Set()
        );
        const importmapScripts: Meta['script'] = [];

        clientEntryLinks.push({
          rel: 'modulepreload',
          href: clientEntryModuleName,
        });

        if (clientImportmapData) {
          importmapScripts.push({
            type: 'importmap',
            content: JSON.stringify(clientImportmapData),
          });

          if (importShim.enabled) {
            importmapScripts.push({
              content: `((o,r,n,s,e,p="loader")=>{n.supports&&n.supports("importmap")||(o[s]=(...n)=>new Promise((n,a)=>{r.head.appendChild(Object.assign(r.createElement("script"),{src:e,crossorigin:"anonymous",async:!0,onload(){o[s][p]?a(Error("["+s+" "+p+"] No "+s+" found: "+e)):n(o[s])},onerror:a}))}).then(o=>o(...n)),o[s][p]=!0)})(self,document,HTMLScriptElement,"importShim",${JSON.stringify(importShim.url)});`,
            });
          }
        }

        const meta: Meta = {
          link: clientEntryLinks,
          style: [
            {
              content: 'web-widget{display:contents}',
            },
          ],
          script: [
            ...importmapScripts,
            {
              type: 'module',
              content: `const m=[${JSON.stringify(clientEntryModuleName)}];typeof importShim==="function"?m.map(n=>importShim(n)):m.map(n=>import(n));`,
            },
          ],
        };

        metaCode = `${FRAMEWORK}.meta = ${JSON.stringify(meta, null, 2)};`;
      }

      return assembleServerEntryTransform({
        code,
        id,
        entryId: entry,
        dev,
        manifestCode,
        metaCode,
        sourcemap,
      });
    },
  };
}
