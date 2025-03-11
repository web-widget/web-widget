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

export interface Vue2WebWidgetPluginOptions
  extends Partial<WebWidgetUserConfig> {
  workspace?: string;
}

export default function vue2WebWidgetPlugin(
  options?: Vue2WebWidgetPluginOptions
) {
  const {
    manifest,
    provide = '@web-widget/vue2',
    workspace = '',
    export: exportWidget = {},
    import: importWidget = {},
  } = options ?? {};

  const workspacePattern = workspace
    ? escapeRegExp(appendSlash(normalizePath(workspace)))
    : workspace;
  const widgetPattern = `[.@]widget`;
  const routePattern = `[.@]route`;
  const modulesPattern = `[.@](?:route|widget)`;
  const extensionPattern = `\\.vue`;
  const modifierPattern = `(?:\\?as=.+)`;
  const vueBuildModeQueryPattern = `(?:\\?vue&type=script\\b.*)`;

  const routeRegExp = new RegExp(
    `^${workspacePattern}.*${routePattern}${extensionPattern}${modifierPattern}?$`
  );

  return webWidgetPlugin({
    manifest,
    provide,
    export: {
      include: new RegExp(
        `^${workspacePattern}.*${modulesPattern}${extensionPattern}${modifierPattern}?$`
      ),
      extractFromExportDefault: [
        {
          name: 'handler',
          default: '{GET({render}){return render()}}',
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
      include: new RegExp(`^.*${widgetPattern}\\.[^?]*${modifierPattern}?$`),
      includeImporter: new RegExp(
        // vite dev mode: .vue
        // vite build mode: .vue?vue&type=script&setup=true&lang.ts
        `^${workspacePattern}.*${extensionPattern}(?:${modifierPattern}|${vueBuildModeQueryPattern})?$`
      ),
      ...importWidget,
    },
  });
}
