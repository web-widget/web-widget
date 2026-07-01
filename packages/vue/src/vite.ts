import { webWidgetPlugin } from '@web-widget/vite-plugin';
import type { WebWidgetUserConfig } from '@web-widget/vite-plugin';
import { posix } from 'node:path';
import { normalizePath } from '@rollup/pluginutils';

function escapeRegExp(path: string) {
  return path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appendSlash(path: string) {
  return path.endsWith(posix.sep) ? path : `${path}${posix.sep}`;
}

export interface VueWebWidgetPluginOptions extends Partial<WebWidgetUserConfig> {
  workspace?: string;
}

export default function vueWebWidgetPlugin(
  options?: VueWebWidgetPluginOptions
) {
  const {
    manifest,
    provide = '@web-widget/vue',
    workspace = '',
    export: exportWidget = {},
    import: importWidget = {},
  } = options ?? {};

  const workspacePattern = workspace
    ? escapeRegExp(normalizePath(appendSlash(workspace)))
    : workspace;
  const widgetPattern = `[.@]widget`;
  const routePattern = `[.@]route`;
  const modulesPattern = `[.@](?:route|widget)`;
  const extensionPattern = `\\.vue`;
  // Patterns tolerate query parameters (e.g. `?as=jsx`, `?import`, `?t=123`)
  // so the native Vite/Rolldown filter API can match at the Rust level
  // without JS-side `normalizeFilterId` normalization.
  const queryBoundary = `(?:\\?|$)`;
  // Vue SFC virtual sub-modules (script/style/template blocks) must be excluded
  // so export-render/import-render only process the main SFC module.
  // import.includeImporter allows `?vue&type=script` (build mode script block)
  // but excludes style/template blocks.
  const vueVirtualModuleQuery = `\\?vue&type=`;
  const vueStyleOrTemplateQuery = `\\?vue&type=(?:style|template)`;

  const routeRegExp = new RegExp(
    `^${workspacePattern}[^?]*${routePattern}${extensionPattern}${queryBoundary}`
  );

  return webWidgetPlugin({
    manifest,
    provide,
    export: {
      exclude: new RegExp(vueVirtualModuleQuery),
      include: new RegExp(
        `^${workspacePattern}[^?]*${modulesPattern}${extensionPattern}${queryBoundary}`
      ),
      extractFromExportDefault: [
        {
          name: 'handler',
          default: '{GET({html}){return html()}}',
          include: routeRegExp,
        },
        {
          name: 'meta',
          default: '{}',
          include: routeRegExp,
        },
      ],
      ...exportWidget,
    },
    import: {
      exclude: new RegExp(vueVirtualModuleQuery),
      include: new RegExp(`^[^?]*${widgetPattern}\\.`),
      excludeImporter: new RegExp(vueStyleOrTemplateQuery),
      includeImporter: new RegExp(
        `^${workspacePattern}[^?]*${extensionPattern}${queryBoundary}`
      ),
      ...importWidget,
    },
  });
}
