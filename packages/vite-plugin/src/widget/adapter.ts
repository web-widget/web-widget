import type { Plugin } from 'vite';
import { exportRenderPlugin } from './export-render';
import { importRenderPlugin } from './import-render';
import { adapterScopePrefix } from './adapter-scope';
import {
  ROUTE_MARKER_PATTERN,
  ROUTE_OR_WIDGET_MARKER_PATTERN,
  WIDGET_MARKER_PATTERN,
} from '@/internal/module-conventions';
import type {
  ConfiguredWidgetTransform,
  WebWidgetPluginOptions,
  WidgetDefaults,
  WidgetModuleFilter,
} from '@/types';

// ── regex pattern builders ────────────────────────────────────────

function extPattern(extensions: string[]): string {
  return `\\.(?:${extensions.map((e) => e.replace(/^\./, '')).join('|')})`;
}

// ── plugin generation ─────────────────────────────────────────────

function buildPluginsForTransform(
  transform: ConfiguredWidgetTransform,
  root: string,
  excludedScopes: string[],
  defaults: WidgetDefaults
): Plugin[] {
  const {
    extensions,
    adapter: adapterModule,
    scope,
    deriveExports,
  } = transform;

  const ext = extPattern(extensions);
  const scopeRe = adapterScopePrefix(scope, excludedScopes, root);

  // Native filters (Rust layer): broad pre-filters on pathname to skip
  // obviously unrelated modules. Framework-specific sub-modules (e.g. Vue SFC
  // ?vue&type=script) still reach the handler, where cleanId/stripModuleIdQuery
  // does the precise check.
  const exportNativeFilter = new RegExp(
    `${ROUTE_OR_WIDGET_MARKER_PATTERN}${ext}`
  );
  const importNativeFilter = new RegExp(`${WIDGET_MARKER_PATTERN}\\.|${ext}`);

  // JS-layer precise patterns (tested against query-stripped id):
  const exportPattern = new RegExp(
    `^${scopeRe}[^?]*${ROUTE_OR_WIDGET_MARKER_PATTERN}${ext}$`
  );
  const importPattern = new RegExp(`^[^?]*${WIDGET_MARKER_PATTERN}\\.[^?]*$`);
  const importerPattern = new RegExp(
    `^${scopeRe}[^?]*${ROUTE_OR_WIDGET_MARKER_PATTERN}${ext}$`
  );
  const filter: WidgetModuleFilter = (key) => importPattern.test(key);

  // Derive handler/meta exports from route modules
  const derive = deriveExports
    ? deriveExports.map((item) => ({
        name: item.name,
        default: item.default,
        include: new RegExp(`^${scopeRe}[^?]*${ROUTE_MARKER_PATTERN}${ext}$`),
      }))
    : undefined;

  return [
    {
      name: '@web-widget:widget-module-filter',
      enforce: 'post',
      api: {
        filter,
        defaults,
      },
    },
    ...exportRenderPlugin({
      nativeFilter: exportNativeFilter,
      exportPattern,
      adapterModule,
      deriveExports: derive,
    }),
    ...importRenderPlugin({
      nativeFilter: importNativeFilter,
      importPattern,
      importerPattern,
      adapterModule,
      defaults,
    }),
  ];
}

// ── public API ────────────────────────────────────────────────────

/**
 * Web widget build transformation plugin (WidgetTransform protocol).
 *
 * Consumes explicitly imported transform definitions, builds file-matching
 * patterns, and injects runtime `render` / `widget` functions into matching
 * modules.
 *
 * @example
 * ```ts
 * webWidgetPlugin({
 *   transforms: [
 *     reactTransform,
 *     { ...vue2Transform, scope: ['src/legacy'] },
 *     { ...vueTransform, scope: ['src/vue3'] },
 *   ],
 * })
 * ```
 */
export function webWidgetPlugin(options: WebWidgetPluginOptions): Plugin[] {
  if (!options?.transforms?.length) {
    throw new TypeError(
      `webWidgetPlugin: "transforms" is required and must not be empty.`
    );
  }

  const root = process.cwd();

  const transforms = options.transforms;

  // Detect extension conflicts without scope
  const extMap = new Map<string, ConfiguredWidgetTransform[]>();
  for (const transform of transforms) {
    for (const e of transform.extensions) {
      const list = extMap.get(e) ?? [];
      list.push(transform);
      extMap.set(e, list);
    }
  }
  for (const [e, list] of extMap) {
    if (list.filter((a) => !a.scope?.length).length > 1) {
      throw new Error(
        `Extension "${e}" is used by multiple transforms without a scope: ` +
          `${list.map((transform) => transform.name).join(', ')}. ` +
          `Use "scope" to disambiguate.`
      );
    }
  }

  return transforms.flatMap((transform) => {
    const excludedScopes = transforms
      .filter(
        (candidate) =>
          candidate !== transform &&
          candidate.scope?.length &&
          candidate.extensions.some((extension) =>
            transform.extensions.includes(extension)
          )
      )
      .flatMap((candidate) => candidate.scope ?? []);

    return buildPluginsForTransform(
      transform,
      root,
      excludedScopes,
      options.defaults ?? {}
    );
  });
}
