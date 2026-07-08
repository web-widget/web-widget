import { describe, expect, test } from '@jest/globals';
import { createSkipServerCssPlugin } from './skip-server-css';

describe('createSkipServerCssPlugin', () => {
  const plugin = createSkipServerCssPlugin();

  test('is SSR build-only', () => {
    expect(plugin.apply).toBe('build');
    expect(plugin.enforce).toBe('pre');
    expect(typeof plugin.applyToEnvironment).toBe('function');
  });

  test('load returns empty content for plain .css files', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    expect(handler.call({}, '/project/src/style.css')).toBe(
      '/* web-widget: css skipped in ssr */'
    );
  });

  test('load does NOT skip preprocessor files (.scss, .less, etc.)', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    for (const ext of ['.less', '.scss', '.sass', '.styl']) {
      expect(
        handler.call({}, `/project/node_modules/antd/dist/style${ext}`)
      ).toBeNull();
    }
  });

  test('load does NOT skip CSS Modules', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    expect(handler.call({}, '/project/src/styles.module.css')).toBeNull();
    expect(handler.call({}, '/project/src/styles.module.scss')).toBeNull();
  });

  test('load skips Vue SFC <style> blocks (non-module)', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    const vueStyleIds = [
      '/project/src/App.vue?vue&type=style&index=0&lang.css',
      '/project/src/App.vue?vue&type=style&index=0&scoped=a24d7f0b&lang.less',
      '/project/src/Comp.vue?vue&type=style&index=1&lang.scss',
    ];
    for (const id of vueStyleIds) {
      expect(handler.call({}, id)).toBe('/* web-widget: css skipped in ssr */');
    }
  });

  test('load does NOT skip Vue SFC <style module> blocks (CSS Modules)', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    const vueModuleStyleIds = [
      '/project/src/App.vue?vue&type=style&index=0&module=true&lang.css',
      '/project/src/App.vue?vue&type=style&index=0&module=true&scoped=abc&lang.less',
      '/project/src/Comp.vue?vue&type=style&index=0&module&lang.scss',
      '/project/src/ModuleCss@widget.vue?vue&type=style&index=0&lang.module.css',
      '/project/src/ModuleCss@widget.vue?vue&type=style&index=0&scoped=abc&lang.module.css',
    ];
    for (const id of vueModuleStyleIds) {
      expect(handler.call({}, id)).toBeNull();
    }
  });

  test('load does NOT skip other IDs with query parameters', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    const idsWithQuery = [
      '/project/src/styles.module.css?import',
      '/project/src/style.css?import',
      '/project/src/style.css?raw',
    ];
    for (const id of idsWithQuery) {
      expect(handler.call({}, id)).toBeNull();
    }
  });

  test('load does NOT intercept non-CSS files', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    expect(handler.call({}, '/project/src/app.tsx')).toBeNull();
    expect(handler.call({}, '/project/src/index.ts')).toBeNull();
  });

  test('load does NOT skip internal virtual modules (\\0 prefix)', () => {
    const load = plugin.load as any;
    const handler = typeof load === 'object' ? load.handler : load;
    expect(handler.call({}, '\0virtual:style.css')).toBeNull();
  });
});
