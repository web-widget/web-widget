import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { normalizePath } from '@rollup/pluginutils';
import type { Plugin } from 'vite';
import { exportRenderPlugin } from './export-render';
import { importRenderPlugin } from './import-render';
import { getWebRouterPluginApi } from '@/internal/manifest';
import type { WebWidgetAdapterConfig, WebWidgetPluginOptions } from '@/types';

/** Supported adapter format major version. */
const SUPPORTED_VERSION = 1;

/** Adapter metadata read from package.json `webWidget` field. */
interface AdapterMetadata {
  version?: string;
  name: string;
  extensions: string[];
  adapter: string;
  deriveExports?: {
    name: string;
    from?: string;
    default: string;
  }[];
}

interface ResolvedAdapter {
  from: string;
  name: string;
  extensions: string[];
  adapter: string;
  scope?: string;
  deriveExports?: AdapterMetadata['deriveExports'];
}

// ── package.json reading ──────────────────────────────────────────

function readAdapterMetadata(from: string, root: string): AdapterMetadata {
  const req = createRequire(path.join(root, 'package.json'));

  let packageJsonPath: string | undefined;
  try {
    packageJsonPath = req.resolve(`${from}/package.json`);
  } catch {
    try {
      const entryPath = req.resolve(from);
      let dir = path.dirname(entryPath);
      while (dir !== path.dirname(dir)) {
        const candidate = path.join(dir, 'package.json');
        if (fs.existsSync(candidate)) {
          packageJsonPath = candidate;
          break;
        }
        dir = path.dirname(dir);
      }
    } catch {
      // will throw below
    }
  }

  if (!packageJsonPath) {
    throw new Error(
      `Cannot resolve adapter package "${from}". Make sure it is installed.`
    );
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const meta = pkg.webWidget as AdapterMetadata | undefined;

  if (!meta) {
    throw new Error(
      `Adapter package "${from}" is missing the "webWidget" field in package.json.`
    );
  }

  if (!meta.name || !meta.extensions || !meta.adapter) {
    throw new Error(
      `Adapter package "${from}" has an incomplete "webWidget" field. ` +
        `Required: name, extensions, adapter.`
    );
  }

  return meta;
}

function checkVersion(meta: AdapterMetadata, from: string): void {
  if (!meta.version) return;
  const major = parseInt(meta.version.split('.')[0], 10);
  if (Number.isNaN(major)) {
    throw new Error(
      `Adapter "${from}" has an invalid version "${meta.version}". Expected a semver string.`
    );
  }
  if (major !== SUPPORTED_VERSION) {
    throw new Error(
      `Adapter "${from}" uses format version ${meta.version}, ` +
        `but the build tool supports version ${SUPPORTED_VERSION}.x.`
    );
  }
}

function resolveAdapter(
  config: string | WebWidgetAdapterConfig,
  root: string
): ResolvedAdapter {
  const userConfig = typeof config === 'string' ? { from: config } : config;
  const { from, scope, ...overrides } = userConfig;
  const declared = readAdapterMetadata(from, root);
  checkVersion(declared, from);

  return {
    from,
    name: overrides.name ?? declared.name,
    extensions: overrides.extensions ?? declared.extensions,
    adapter: overrides.adapter ?? declared.adapter,
    scope,
    deriveExports: declared.deriveExports,
  };
}

// ── regex pattern builders ────────────────────────────────────────

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extPattern(extensions: string[]): string {
  return `\\.(?:${extensions.map((e) => e.replace(/^\./, '')).join('|')})`;
}

/** Protocol-level module markers: `@widget` and `@route`. */
const MARKERS_RE = `[.@](?:widget|route)`;
const WIDGET_MARKER_RE = `[.@]widget`;
const ROUTE_MARKER_RE = `[.@]route`;

function scopePrefix(scope: string | undefined, root: string): string {
  if (!scope) return '';
  const resolved = normalizePath(path.resolve(root, scope));
  return escapeRegExp(resolved.endsWith('/') ? resolved : `${resolved}/`);
}

// ── plugin generation ─────────────────────────────────────────────

function buildPluginsForAdapter(
  resolved: ResolvedAdapter,
  root: string
): Plugin[] {
  const { from, extensions, adapter, scope, deriveExports } = resolved;

  // Adapter module specifier: "@web-widget/react/adapter"
  const provide = `${from}/${adapter.replace(/^\.\//, '')}`;

  const ext = extPattern(extensions);
  const scopeRe = scopePrefix(scope, root);

  // Native filters (Rust layer): broad pre-filters on pathname to skip
  // obviously unrelated modules. Framework-specific sub-modules (e.g. Vue SFC
  // ?vue&type=script) still reach the handler, where cleanId/stripModuleIdQuery
  // does the precise check.
  const exportNativeFilter = new RegExp(`${MARKERS_RE}${ext}`);
  const importNativeFilter = new RegExp(`${WIDGET_MARKER_RE}\\.|${ext}`);

  // JS-layer precise patterns (tested against query-stripped id):
  const exportPattern = new RegExp(`^${scopeRe}[^?]*${MARKERS_RE}${ext}$`);
  const importPattern = new RegExp(`^[^?]*${WIDGET_MARKER_RE}\\.[^?]*$`);
  const importerPattern = new RegExp(`^${scopeRe}[^?]*${ext}$`);

  // Derive handler/meta exports from route modules
  const derive = deriveExports
    ? deriveExports.map((item) => ({
        name: item.name,
        default: item.default,
        include: new RegExp(`^${scopeRe}[^?]*${ROUTE_MARKER_RE}${ext}$`),
      }))
    : undefined;

  return [
    {
      name: '@web-widget:widget-module-filter',
      enforce: 'post',
      config(config) {
        getWebRouterPluginApi(config)?.setWidgetModuleFilter((key: string) =>
          importPattern.test(key)
        );
      },
    },
    ...exportRenderPlugin({
      nativeFilter: exportNativeFilter,
      exportPattern,
      provide,
      deriveExports: derive,
    }),
    ...importRenderPlugin({
      nativeFilter: importNativeFilter,
      importPattern,
      importerPattern,
      provide,
    }),
  ];
}

// ── public API ────────────────────────────────────────────────────

/**
 * Web widget build transformation plugin (WebWidgetAdapter protocol).
 *
 * Reads adapter metadata from each package's `webWidget` field in
 * package.json, builds file-matching patterns, and injects the
 * runtime `render` / `container` functions into matching modules.
 *
 * @example
 * ```ts
 * webWidgetPlugin({
 *   adapters: [
 *     '@web-widget/react',
 *     { from: '@web-widget/vue2', scope: 'src/legacy' },
 *     { from: '@web-widget/vue', scope: 'src/vue3' },
 *   ],
 * })
 * ```
 */
export function webWidgetPlugin(options: WebWidgetPluginOptions): Plugin[] {
  if (!options?.adapters?.length) {
    throw new TypeError(
      `webWidgetPlugin: "adapters" is required and must not be empty.`
    );
  }

  const root = process.cwd();

  const adapters = options.adapters.map((a) => resolveAdapter(a, root));

  // Detect extension conflicts without scope
  const extMap = new Map<string, ResolvedAdapter[]>();
  for (const a of adapters) {
    for (const e of a.extensions) {
      const list = extMap.get(e) ?? [];
      list.push(a);
      extMap.set(e, list);
    }
  }
  for (const [e, list] of extMap) {
    if (list.filter((a) => !a.scope).length > 1) {
      throw new Error(
        `Extension "${e}" is used by multiple adapters without a scope: ` +
          `${list.map((a) => a.from).join(', ')}. Use "scope" to disambiguate.`
      );
    }
  }

  return adapters.flatMap((a) => buildPluginsForAdapter(a, root));
}
