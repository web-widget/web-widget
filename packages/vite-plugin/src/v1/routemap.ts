import path from 'node:path';
import type { EmittedFile, OutputBundle, OutputChunk } from 'rollup';
import type { Manifest as ViteManifest } from 'vite';
import { getLinks, normalizePath } from '@/utils';
import type { ResolvedWebRouterConfig, RouteMap } from '@/types';

type Imports = Record<string, string>;
type Scopes = Record<string, Imports>;
interface ImportMap {
  imports?: Imports;
  scopes?: Scopes;
}

/** @deprecated */
export function generateServerRoutemap(
  root: string,
  base: string,
  clientImportmap: ImportMap,
  manifest: RouteMap,
  viteManifest: ViteManifest,
  resolvedWebRouterConfig: ResolvedWebRouterConfig,
  bundle: OutputBundle
): EmittedFile[] {
  function getChunkName(chunk: OutputChunk) {
    if (chunk.facadeModuleId) {
      let name = normalizePath(path.relative(root, chunk.facadeModuleId));
      return name.replace(/\0/g, '');
    } else {
      return `_` + path.basename(chunk.fileName);
    }
  }

  const routeModuleMap = Object.values(bundle).reduce((map, chunk) => {
    if (chunk.type === 'chunk') {
      map.set(getChunkName(chunk), chunk);
    }
    return map;
  }, new Map());

  function getClientEntryAssent() {
    const asset =
      viteManifest[
        path.relative(root, resolvedWebRouterConfig.input.client.entry)
      ];

    if (!asset) {
      throw new Error(`No client entry found.`);
    }

    return asset;
  }

  function getBasename(file: string) {
    return path
      .basename(file, path.extname(file))
      .replace('.server', '')
      .replace('.client', '');
  }

  const imports: string[] = [];
  function getImportModule(moduleName: string) {
    const moduleId = path.resolve(
      path.dirname(resolvedWebRouterConfig.input.server.entry),
      moduleName
    );
    const fileName = path.relative(root, moduleId);
    const chunk = routeModuleMap.get(fileName);

    if (!chunk || chunk.type !== 'chunk' || !chunk.isEntry) {
      throw new Error(
        `Unable to build routemap.` +
          ` Since "${moduleName}" is not found in Rollup's output,` +
          ` it is recommended to try renaming the file: ${moduleId}`
      );
    }

    const source = './' + chunk.fileName;
    imports.push(source);

    return source;
  }

  // https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_expressions#escaping
  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  // eslint-disable-next-line no-template-curly-in-string
  // const basePlaceholder = "${workspace}";

  const json = Object.entries(manifest).reduce(
    (manifest, [key, value]) => {
      if (Array.isArray(value)) {
        // @ts-ignore
        manifest[key] = [];
        value.forEach((mod) => {
          // @ts-ignore
          manifest[key].push({
            ...mod,
            module: getImportModule(mod.module),
          });
        });
      } else if (value.module) {
        // @ts-ignore
        manifest[key] = {
          ...value,
          module: getImportModule(value.module),
        };
      } else {
        // @ts-ignore
        manifest[key] = value;
      }
      return manifest;
    },
    {
      //  base: basePlaceholder,
    } as RouteMap
  );

  const routemapJsonCode = JSON.stringify(json, null, 2);
  const routemapJsCode =
    imports
      .map((module, index) => `import * as _${index} from "${module}";`)
      .join('\n') +
    '\n\n' +
    `export default ${imports.reduce(
      (routemapJsonCode, source, index) =>
        routemapJsonCode.replaceAll(
          new RegExp(`(\\s*)${escapeRegExp(`"module": "${source}"`)}`, 'g'),
          `$1"source": "${source}",$1"module": _${index}`
        ),
      routemapJsonCode
    )}`; /*.replace(
      JSON.stringify(basePlaceholder),
      `new URL("./", import.meta.url).href`
    )*/

  const routemapDtsCode = [
    `import type { Manifest } from '@web-widget/web-router';`,
    `export default {} as Manifest;`,
  ].join('\n');

  const entryFileName = path.relative(
    root,
    resolvedWebRouterConfig.input.server.entry
  );
  const entryModuleName = './' + routeModuleMap.get(entryFileName).fileName;
  const clientImportmapCode = JSON.stringify(clientImportmap);
  const clientEntryModuleName = base + getClientEntryAssent().file;
  const clientEntryLink = getLinks(
    viteManifest,
    path.relative(root, resolvedWebRouterConfig.input.client.entry),
    base
  );

  clientEntryLink.push({
    rel: 'modulepreload',
    href: clientEntryModuleName,
  });

  const entryJsCode = [
    `import { mergeMeta } from "@web-widget/helpers";`,
    `import entry from ${JSON.stringify(entryModuleName)};`,
    `export * from ${JSON.stringify(entryModuleName)};`,
    `export default function start(manifest, options = {}) {`,
    `  return entry(manifest, {`,
    `    baseAsset: ${JSON.stringify(base)},`,
    `    ...options,`,
    `    defaultMeta: mergeMeta(options.defaultMeta || {}, {`,
    `      link: ${JSON.stringify(clientEntryLink)},`,
    `      style: [{`,
    `        content: "web-widget{display:contents}"`,
    `      }],`,
    `      script: [{`,
    `        type: "importmap",`,
    `        content: JSON.stringify(${clientImportmapCode})`,
    `      }, {`,
    `        type: "module",`,
    `        content: [`,
    `          'const modules = [${JSON.stringify(clientEntryModuleName)}];',`,
    `          'typeof importShim === "function"',`,
    `            '? modules.map(moduleName => importShim(moduleName))',`,
    `            ': modules.map(moduleName => import(moduleName))'`,
    `        ].join("")`,
    `      }]`,
    `    })`,
    `  });`,
    `}`,
  ].join('\n');
  const entryDtsCode = [
    `import type { Manifest, StartOptions } from '@web-widget/web-router';`,
    `export default {} as (manifest: Manifest, options?: StartOptions) => WebRouter;`,
  ].join('\n');

  const routemapBasename = getBasename(
    resolvedWebRouterConfig.input.server.routemap
  );
  const entryBasename = getBasename(resolvedWebRouterConfig.input.server.entry);

  return [
    // {
    //   type: "prebuilt-chunk",
    //   fileName: routemapBasename + ".json",
    //   code: routemapJsonCode,
    // },
    {
      type: 'prebuilt-chunk',
      fileName: routemapBasename + '.js',
      code: routemapJsCode,
    },
    {
      type: 'prebuilt-chunk',
      fileName: routemapBasename + '.d.ts',
      code: routemapDtsCode,
    },
    {
      type: 'prebuilt-chunk',
      fileName: entryBasename + '.js',
      code: entryJsCode,
    },
    {
      type: 'prebuilt-chunk',
      fileName: entryBasename + '.d.ts',
      code: entryDtsCode,
    },
  ];
}
