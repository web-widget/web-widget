import { describe, expect, jest, test } from '@jest/globals';
import {
  transformWidgetImports,
  type TransformWidgetImportsContext,
  type TransformWidgetImportsOptions,
} from './import-render';

const ROOT = '/project';
const BASE = '/';
const IMPORT_PATTERN = /@widget/;
const ADAPTER_MODULE = '@web-widget/react/adapter';
const IMPORTER_ID = '/project/src/page@route.tsx';

function makeCtx(
  overrides: Partial<TransformWidgetImportsContext> = {}
): TransformWidgetImportsContext {
  return {
    resolve: async (specifier) => ({
      id: `${ROOT}/src/${specifier.replace('./', '')}`,
    }),
    emitFile: () => 'fake-ref-id',
    ...overrides,
  };
}

function makeOptions(
  code: string,
  overrides: Partial<TransformWidgetImportsOptions> = {}
): TransformWidgetImportsOptions {
  return {
    code,
    id: IMPORTER_ID,
    dev: true,
    isServer: false,
    root: ROOT,
    base: BASE,
    sourcemap: false,
    importPattern: IMPORT_PATTERN,
    adapterModule: ADAPTER_MODULE,
    defaults: {},
    ...overrides,
  };
}

describe('transformWidgetImports', () => {
  describe('static import pattern', () => {
    test('dev mode', async () => {
      const code = `import Counter from './Counter@widget.vue';`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        'import { widget as __$widget0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$widget0$__(() => import("./Counter@widget.vue"), { import: "/src/Counter@widget.vue", name: "Counter" });\n' +
          ';'
      );
    });

    test('production client build', async () => {
      const code = `import Counter from './Counter@widget.vue';`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: false, isServer: false })
      );
      expect(result!.code).toBe(
        'import { widget as __$widget0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$widget0$__(() => import("./Counter@widget.vue"), { import: import.meta.ROLLUP_FILE_URL_fake-ref-id, name: "Counter" });\n' +
          ';'
      );
    });

    test('server build', async () => {
      const code = `import Counter from './Counter@widget.vue';`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: false, isServer: true })
      );
      expect(result!.code).toBe(
        'import { resolveWidgetAsset } from "virtual:web-widget-server-assets";\n' +
          'import { widget as __$widget0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$widget0$__(() => import("./Counter@widget.vue"), { import: resolveWidgetAsset("src/Counter@widget.vue"), name: "Counter" });\n' +
          ';'
      );
    });

    test('multiple static imports', async () => {
      const code = `import Header from './Header@widget.vue';\nimport Footer from './Footer@widget.vue';`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        'import { widget as __$widget0$__ } from "@web-widget/react/adapter";\n' +
          'import { widget as __$widget1$__ } from "@web-widget/react/adapter";\n' +
          'const Header = /* @__PURE__ */ __$widget0$__(() => import("./Header@widget.vue"), { import: "/src/Header@widget.vue", name: "Header" });\n' +
          'const Footer = /* @__PURE__ */ __$widget1$__(() => import("./Footer@widget.vue"), { import: "/src/Footer@widget.vue", name: "Footer" });\n' +
          ';\n;'
      );
    });

    test('import { default as Foo } syntax', async () => {
      const code = `import { default as Counter } from './Counter@widget.vue';`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        'import { widget as __$widget0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$widget0$__(() => import("./Counter@widget.vue"), { import: "/src/Counter@widget.vue", name: "Counter" });\n' +
          ';'
      );
    });

    test('injects build-time defaults', async () => {
      const code = `import Counter from './Counter@widget.vue';`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, {
          defaults: { loading: 'idle', renderTarget: 'shadow' },
        })
      );
      expect(result!.code).toContain(
        '{ loading: "idle", renderTarget: "shadow", import: "/src/Counter@widget.vue", name: "Counter" }'
      );
    });

    test('injects Vite-transformed widget styles in dev', async () => {
      const code = `import Counter from './Counter@widget.vue';`;
      const getDevStyles = async () => [
        {
          id: '/project/src/counter.module.css',
          content: '._button_hash{border-radius:8px}',
        },
      ];
      const result = await transformWidgetImports(
        makeCtx({ getDevStyles }),
        makeOptions(code, { dev: true, isServer: true })
      );

      expect(result!.code).toContain(
        'devStyles: [{"id":"/project/src/counter.module.css","content":"._button_hash{border-radius:8px}"}]'
      );
    });

    test('does not collect widget styles for production builds', async () => {
      const code = `import Counter from './Counter@widget.vue';`;
      const getDevStyles = jest.fn(async () => []);

      await transformWidgetImports(
        makeCtx({ getDevStyles }),
        makeOptions(code, { dev: false, isServer: true })
      );

      expect(getDevStyles).not.toHaveBeenCalled();
    });
  });

  describe('explicit widget() pattern', () => {
    test('no existing options', async () => {
      const code = `const Counter = widget(() => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = widget(() => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('merge into existing options', async () => {
      const code = `const Counter = widget(() => import('./Counter@widget.vue'), { loading: 'eager' });`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = widget(() => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter", loading: \'eager\' });'
      );
    });

    test('injects widget styles into explicit widget options in dev', async () => {
      const code = `const Counter = widget(() => import('./Counter@widget.vue'), { renderTarget: 'shadow' });`;
      const result = await transformWidgetImports(
        makeCtx({
          getDevStyles: async () => [
            { id: '/project/src/widget.css', content: '.button{color:red}' },
          ],
        }),
        makeOptions(code, { dev: true, isServer: true })
      );

      expect(result!.code).toContain(
        '{ devStyles: [{"id":"/project/src/widget.css","content":".button{color:red}"}], import: "/src/Counter@widget.vue", name: "Counter", renderTarget: \'shadow\' }'
      );
    });

    test('keeps explicit options after build-time defaults', async () => {
      const code = `const Counter = widget(() => import('./Counter@widget.vue'), { loading: 'eager', renderTarget: 'light' });`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, {
          defaults: { loading: 'idle', renderTarget: 'shadow' },
        })
      );
      expect(result!.code).toContain(
        '{ loading: "idle", renderTarget: "shadow", import: "/src/Counter@widget.vue", name: "Counter", loading: \'eager\', renderTarget: \'light\' }'
      );
    });

    test('is idempotent when import options were already injected', async () => {
      const code = `const Counter = widget(() => import('./Counter@widget.vue'), { import: resolveWidgetAsset("src/Counter@widget.vue"), name: "Counter" });`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: false, isServer: true })
      );
      expect(result).toBeNull();
    });

    test('let declaration', async () => {
      const code = `let Counter = widget(() => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'let Counter = widget(() => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('Fast Refresh injected code (_c = )', async () => {
      const code = `const Counter = widget(_c = () => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = widget(_c = () => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('async arrow function', async () => {
      const code = `const Counter = widget(async () => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = widget(async () => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('multi-line formatting (Prettier wrapping)', async () => {
      const code =
        "const Counter = widget(\n  () => import('./Counter@widget.vue')\n);";
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = widget(\n  () => import(\'./Counter@widget.vue\')\n, { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });
  });

  describe('error handling', () => {
    test('throws on dynamic widget import outside widget()', async () => {
      const code = `const mod = await import('./Counter@widget.vue');`;
      await expect(
        transformWidgetImports(makeCtx(), makeOptions(code))
      ).rejects.toThrow(SyntaxError);
    });

    test('throws on obj.widget() method call', async () => {
      const code = `const Counter = obj.widget(() => import('./Counter@widget.vue'));`;
      await expect(
        transformWidgetImports(makeCtx(), makeOptions(code))
      ).rejects.toThrow(SyntaxError);
    });

    test('throws on static import without default name', async () => {
      const code = `import { foo } from './Counter@widget.vue';`;
      await expect(
        transformWidgetImports(makeCtx(), makeOptions(code))
      ).rejects.toThrow(/default import/);
    });

    test('throws on widget() with variable options', async () => {
      const code = `const Counter = widget(() => import('./Counter@widget.vue'), opts);`;
      await expect(
        transformWidgetImports(makeCtx(), makeOptions(code))
      ).rejects.toThrow(/object literal/);
    });
  });

  describe('no-op cases', () => {
    test('returns null when no widget imports', async () => {
      const code = `import React from 'react';\nimport { foo } from './utils';`;
      const result = await transformWidgetImports(makeCtx(), makeOptions(code));
      expect(result).toBeNull();
    });

    test('returns null for non-widget dynamic import', async () => {
      const code = `const mod = import('./utils');`;
      const result = await transformWidgetImports(
        makeCtx({
          resolve: async (s) => ({ id: `${ROOT}/src/${s}` }),
        }),
        makeOptions(code)
      );
      expect(result).toBeNull();
    });
  });

  describe('mixed imports', () => {
    test('static import + widget call', async () => {
      const code = `import Header from './Header@widget.vue';\nconst Footer = widget(() => import('./Footer@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        'import { widget as __$widget0$__ } from "@web-widget/react/adapter";\n' +
          'const Header = /* @__PURE__ */ __$widget0$__(() => import("./Header@widget.vue"), { import: "/src/Header@widget.vue", name: "Header" });\n' +
          ';\n' +
          'const Footer = widget(() => import(\'./Footer@widget.vue\'), { import: "/src/Footer@widget.vue", name: "Footer" });'
      );
    });

    test('multiple widget calls', async () => {
      const code = `const A = widget(() => import('./A@widget.vue'));\nconst B = widget(() => import('./B@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const A = widget(() => import(\'./A@widget.vue\'), { import: "/src/A@widget.vue", name: "A" });\n' +
          'const B = widget(() => import(\'./B@widget.vue\'), { import: "/src/B@widget.vue", name: "B" });'
      );
    });
  });
});
