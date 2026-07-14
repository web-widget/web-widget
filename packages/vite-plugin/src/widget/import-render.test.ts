import { describe, expect, test } from '@jest/globals';
import {
  transformWidgetImports,
  type TransformWidgetImportsContext,
  type TransformWidgetImportsOptions,
} from './import-render';

const ROOT = '/project';
const BASE = '/';
const IMPORT_PATTERN = /@widget/;
const PROVIDE = '@web-widget/react/adapter';
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
    provide: PROVIDE,
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
        'import { container as __$container0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$container0$__(() => import("./Counter@widget.vue"), { import: "/src/Counter@widget.vue", name: "Counter" });\n' +
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
        'import { container as __$container0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$container0$__(() => import("./Counter@widget.vue"), { import: import.meta.ROLLUP_FILE_URL_fake-ref-id, name: "Counter" });\n' +
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
          'import { container as __$container0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$container0$__(() => import("./Counter@widget.vue"), { import: resolveWidgetAsset("src/Counter@widget.vue"), name: "Counter" });\n' +
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
        'import { container as __$container0$__ } from "@web-widget/react/adapter";\n' +
          'import { container as __$container1$__ } from "@web-widget/react/adapter";\n' +
          'const Header = /* @__PURE__ */ __$container0$__(() => import("./Header@widget.vue"), { import: "/src/Header@widget.vue", name: "Header" });\n' +
          'const Footer = /* @__PURE__ */ __$container1$__(() => import("./Footer@widget.vue"), { import: "/src/Footer@widget.vue", name: "Footer" });\n' +
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
        'import { container as __$container0$__ } from "@web-widget/react/adapter";\n' +
          'const Counter = /* @__PURE__ */ __$container0$__(() => import("./Counter@widget.vue"), { import: "/src/Counter@widget.vue", name: "Counter" });\n' +
          ';'
      );
    });
  });

  describe('explicit container() pattern', () => {
    test('no existing options', async () => {
      const code = `const Counter = container(() => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = container(() => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('merge into existing options', async () => {
      const code = `const Counter = container(() => import('./Counter@widget.vue'), { loading: 'eager' });`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = container(() => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter", loading: \'eager\' });'
      );
    });

    test('let declaration', async () => {
      const code = `let Counter = container(() => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'let Counter = container(() => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('Fast Refresh injected code (_c = )', async () => {
      const code = `const Counter = container(_c = () => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = container(_c = () => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('async arrow function', async () => {
      const code = `const Counter = container(async () => import('./Counter@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = container(async () => import(\'./Counter@widget.vue\'), { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });

    test('multi-line formatting (Prettier wrapping)', async () => {
      const code =
        "const Counter = container(\n  () => import('./Counter@widget.vue')\n);";
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const Counter = container(\n  () => import(\'./Counter@widget.vue\')\n, { import: "/src/Counter@widget.vue", name: "Counter" });'
      );
    });
  });

  describe('error handling', () => {
    test('throws on dynamic widget import outside container()', async () => {
      const code = `const mod = await import('./Counter@widget.vue');`;
      await expect(
        transformWidgetImports(makeCtx(), makeOptions(code))
      ).rejects.toThrow(SyntaxError);
    });

    test('throws on obj.container() method call', async () => {
      const code = `const Counter = obj.container(() => import('./Counter@widget.vue'));`;
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

    test('throws on container() with variable options', async () => {
      const code = `const Counter = container(() => import('./Counter@widget.vue'), opts);`;
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
    test('static import + container call', async () => {
      const code = `import Header from './Header@widget.vue';\nconst Footer = container(() => import('./Footer@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        'import { container as __$container0$__ } from "@web-widget/react/adapter";\n' +
          'const Header = /* @__PURE__ */ __$container0$__(() => import("./Header@widget.vue"), { import: "/src/Header@widget.vue", name: "Header" });\n' +
          ';\n' +
          'const Footer = container(() => import(\'./Footer@widget.vue\'), { import: "/src/Footer@widget.vue", name: "Footer" });'
      );
    });

    test('multiple container calls', async () => {
      const code = `const A = container(() => import('./A@widget.vue'));\nconst B = container(() => import('./B@widget.vue'));`;
      const result = await transformWidgetImports(
        makeCtx(),
        makeOptions(code, { dev: true })
      );
      expect(result!.code).toBe(
        '\n' +
          'const A = container(() => import(\'./A@widget.vue\'), { import: "/src/A@widget.vue", name: "A" });\n' +
          'const B = container(() => import(\'./B@widget.vue\'), { import: "/src/B@widget.vue", name: "B" });'
      );
    });
  });
});
