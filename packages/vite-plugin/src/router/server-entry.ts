import path from 'node:path';
import type { Plugin } from 'vite';
import type { RouterPluginHost } from './host';
import { applyToServerEnvironment } from '@/internal/environment';
import {
  buildDevManifestCode,
  buildProdManifestCode,
} from '@/internal/routemap-manifest-code';
import {
  assembleServerEntryTransform,
  buildDevServerEntryMeta,
  SERVER_ENTRY_PLACEHOLDER,
} from '@/internal/server-entry-transform';
import { normalizePath } from '@/internal/path';
import { SERVER_ASSETS_MODULE_ID } from '@/internal/server-assets-module';

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
      const { dev, resolvedWebRouterConfig, root, sourcemap } = host.state;
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
        // In the reversed build order (server -> client), the client manifest
        // is not available during the server build. Instead of inlining asset
        // URLs at transform time, emit runtime resolver calls that read from
        // `virtual:web-widget-server-assets` (populated after the client build).
        const clientImportmapData = await api.clientImportmap();
        const importShim = resolvedWebRouterConfig.importShim;

        // Build static importmap script entries (these don't depend on the
        // client manifest).
        const staticScripts: string[] = [];
        if (clientImportmapData) {
          staticScripts.push(
            `{ type: 'importmap', content: ${JSON.stringify(
              JSON.stringify(clientImportmapData)
            )} }`
          );
          if (importShim.enabled) {
            staticScripts.push(
              `{ content: ${JSON.stringify(
                `((o,r,n,s,e,p="loader")=>{n.supports&&n.supports("importmap")||(o[s]=(...n)=>new Promise((n,a)=>{r.head.appendChild(Object.assign(r.createElement("script"),{src:e,crossorigin:"anonymous",async:!0,onload(){o[s][p]?a(Error("["+s+" "+p+"] No "+s+" found: "+e)):n(o[s])},onerror:a}))}).then(o=>o(...n)),o[s][p]=!0)})(self,document,HTMLScriptElement,"importShim",${JSON.stringify(
                  importShim.url
                )});`
              )} }`
            );
          }
        }

        // Generate meta code with runtime resolver calls.
        const scriptsArray = [
          ...staticScripts,
          `{ type: 'module', content: 'const m=[' + JSON.stringify(__entryModule__) + '];typeof importShim==="function"?m.map(n=>importShim(n)):m.map(n=>import(n));' }`,
        ].join(', ');

        metaCode = [
          `import { resolveWidgetAsset, resolveLinks, resolveStyle } from ${JSON.stringify(
            SERVER_ASSETS_MODULE_ID
          )};`,
          `const __entryId__ = ${JSON.stringify(entryFileName)};`,
          `const __entryModule__ = resolveWidgetAsset(__entryId__);`,
          `const __entryLinks__ = resolveLinks(__entryId__) || [];`,
          `const __entryStyle__ = resolveStyle(__entryId__);`,
          `${FRAMEWORK}.meta = {`,
          `  link: [...__entryLinks__, { rel: 'modulepreload', href: __entryModule__ }],`,
          `  style: [{ content: 'web-widget{display:contents}' }, ...(__entryStyle__ ? [{ content: __entryStyle__ }] : [])],`,
          `  script: [${scriptsArray}],`,
          `};`,
        ].join('\n');
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
