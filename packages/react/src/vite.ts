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

export interface ReactWebWidgetPluginOptions
  extends Partial<WebWidgetUserConfig> {
  workspace?: string;
}

export default function reactWebWidgetPlugin(
  options?: ReactWebWidgetPluginOptions
) {
  const {
    provide = '@web-widget/react',
    workspace = '',
    export: exportWidget = {},
    import: importWidget = {},
    manifest,
  } = options ?? {};
  const workspacePattern = workspace
    ? escapeRegExp(normalizePath(appendSlash(workspace)))
    : workspace;
  const widgetPattern = `[.@]widget`;
  const modulesPattern = `[.@](?:route|widget)`;
  const extensionPattern = `\\.(?:tsx|jsx)`;

  return webWidgetPlugin({
    manifest,
    provide,
    export: {
      include: new RegExp(
        `^${workspacePattern}[^?]*${modulesPattern}${extensionPattern}$`
      ),
      ...exportWidget,
    },
    import: {
      include: new RegExp(`^[^?]*${widgetPattern}\\.[^?]*$`),
      includeImporter: new RegExp(
        // NOTE: Should not match this: app.vue?vue&type=script&lang.jsx
        `^${workspacePattern}[^?]*${extensionPattern}$`
      ),
      ...importWidget,
    },
  });
}
