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

export interface ReactWebWidgetPluginOptions extends Partial<WebWidgetUserConfig> {
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
  // Patterns tolerate query parameters (e.g. `?as=jsx`, `?import`, `?t=123`)
  // so the native Vite/Rolldown filter API can match at the Rust level
  // without JS-side `normalizeFilterId` normalization.
  const queryBoundary = `(?:\\?|$)`;

  return webWidgetPlugin({
    manifest,
    provide,
    export: {
      include: new RegExp(
        `^${workspacePattern}[^?]*${modulesPattern}${extensionPattern}${queryBoundary}`
      ),
      ...exportWidget,
    },
    import: {
      include: new RegExp(`^[^?]*${widgetPattern}\\.`),
      includeImporter: new RegExp(
        `^${workspacePattern}[^?]*${extensionPattern}${queryBoundary}`
      ),
      ...importWidget,
    },
  });
}
