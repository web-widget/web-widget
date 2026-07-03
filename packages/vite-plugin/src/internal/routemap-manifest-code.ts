import { encodeModuleSource } from '@/dev/module-source';
import type { RouteMap } from '@/types';
import { escapeRegExp } from '@/internal/regexp';

export function collectRoutemapModulePaths(
  routemapJson: RouteMap | Record<string, unknown>
): string[] {
  const imports: string[] = [];

  for (const [key, value] of Object.entries(routemapJson)) {
    if (key === '$schema') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const mod of value) {
        if (mod && typeof mod === 'object' && 'module' in mod && mod.module) {
          imports.push(mod.module);
        }
      }
    } else if (value && typeof value === 'object' && 'module' in value) {
      const module = (value as { module?: string }).module;
      if (module) {
        imports.push(module);
      }
    }
  }

  return [...new Set(imports)];
}

export function buildDevManifestCode(options: {
  framework: string;
  routemapJson: RouteMap;
  routemapPath: string;
}): string {
  const { framework, routemapJson, routemapPath } = options;
  const imports = collectRoutemapModulePaths(routemapJson);
  const loaderEntries = imports
    .map(
      (module) =>
        `  ${JSON.stringify(module)}: () => import(${JSON.stringify(module)})`
    )
    .join(',\n');
  const sourceEntries = imports
    .map(
      (module) =>
        `  ${JSON.stringify(module)}: ${JSON.stringify(encodeModuleSource(module))}`
    )
    .join(',\n');

  return `
import importmap from ${JSON.stringify(routemapPath)} assert { type: "json" };
const __WEB_WIDGET_MODULE_LOADERS__ = {
${loaderEntries}
};
const __WEB_WIDGET_MODULE_SOURCES__ = {
${sourceEntries}
};
${framework}.manifest = (() => {
  const createLoader = (item) => {
    const source = item.module;
    if (source) {
      item.module = async () => {
        const mod = await __WEB_WIDGET_MODULE_LOADERS__[source]();
        return {
          $source: __WEB_WIDGET_MODULE_SOURCES__[source],
          ...mod,
        };
      };
    }
  };
  const manifest = structuredClone(importmap);
  for (const value of Object.values(manifest)) {
    if (Array.isArray(value)) {
      for (const mod of value) {
        createLoader(mod);
      }
    } else {
      createLoader(value);
    }
  }
  manifest.moduleSource = function(ctx) {
    var mod = ctx.module;
    if (mod && mod.$source) return mod.$source;
  };
  manifest.exposeErrors = true;
  return manifest;
})();
`;
}

export function buildProdManifestCode(options: {
  framework: string;
  routemapJson: RouteMap;
}): string {
  const { framework, routemapJson } = options;
  const imports = collectRoutemapModulePaths(routemapJson);
  const routemapJsonCode = JSON.stringify(routemapJson, null, 2);

  return (
    imports
      .map(
        (module, index) =>
          `import * as _${index} from ${JSON.stringify(module)};`
      )
      .join('\n') +
    '\n\n' +
    `${framework}.manifest = ${imports.reduce(
      (code, source, index) =>
        code.replaceAll(
          new RegExp(`(\\s*)${escapeRegExp(`"module": "${source}"`)}`, 'g'),
          `$1"module": _${index}`
        ),
      routemapJsonCode
    )}`
  );
}
