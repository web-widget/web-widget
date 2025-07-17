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

export interface VueWebWidgetPluginOptions
  extends Partial<WebWidgetUserConfig> {
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
  const vueBuildModeQueryPattern = `(?:\\?vue&type=script\\b.*)`;

  const routeRegExp = new RegExp(
    `^${workspacePattern}.*${routePattern}${extensionPattern}$`
  );

  return webWidgetPlugin({
    manifest,
    provide,
    export: {
      include: new RegExp(
        `^${workspacePattern}[^?]*${modulesPattern}${extensionPattern}$`
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
      include: new RegExp(`^[^?]*${widgetPattern}\\.[^?]*$`),
      includeImporter: new RegExp(
        // vite dev mode: .vue
        // vite build mode: .vue?vue&type=script&setup=true&lang.ts
        `^${workspacePattern}[^?]*${extensionPattern}${vueBuildModeQueryPattern}?$`
      ),
      ...importWidget,
    },
  });
}
