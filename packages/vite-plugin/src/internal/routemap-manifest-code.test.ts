import {
  buildDevManifestCode,
  buildProdManifestCode,
  collectRoutemapModulePaths,
} from './routemap-manifest-code';

describe('routemap-manifest-code', () => {
  test('collectRoutemapModulePaths deduplicates module paths', () => {
    expect(
      collectRoutemapModulePaths({
        routes: [{ module: './routes/a.ts', pathname: '/a' }],
        middlewares: [{ module: './routes/a.ts', pathname: '*' }],
      })
    ).toEqual(['./routes/a.ts']);
  });

  test('buildDevManifestCode uses lazy import and plain $source path', () => {
    const code = buildDevManifestCode({
      framework: '__framework__',
      routemapPath: './routemap.server.json',
      routemapJson: {
        routes: [
          {
            module: './routes/examples/middleware/index@middleware.ts',
            pathname: '/examples/middleware',
          },
        ],
      },
    });

    expect(code).toContain('__WEB_WIDGET_MODULE_LOADERS__');
    expect(code).toContain(
      '"./routes/examples/middleware/index@middleware.ts": () => import("./routes/examples/middleware/index@middleware.ts")'
    );
    expect(code).toContain('__WEB_WIDGET_MODULE_SOURCES__');
    expect(code).toContain(
      '"./routes/examples/middleware/index@middleware.ts": "/routes/examples/middleware/index@middleware.ts"'
    );
    expect(code).toContain('$source: __WEB_WIDGET_MODULE_SOURCES__[source]');
    expect(code).not.toContain('manifest.moduleSource');
    expect(code).not.toContain('responseHeaders');
    expect(code).toContain('manifest.exposeErrors = true');
  });

  test('buildProdManifestCode inlines route modules as imports', () => {
    const code = buildProdManifestCode({
      framework: '__framework__',
      routemapJson: {
        routes: [
          {
            module: './routes/index.ts',
            pathname: '/',
          },
        ],
      },
    });

    expect(code).toContain('import * as _0 from "./routes/index.ts"');
    expect(code).toContain('"module": _0');
    expect(code).toContain('__framework__.manifest =');
  });
});
