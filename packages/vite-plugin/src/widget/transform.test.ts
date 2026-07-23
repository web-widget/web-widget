import { createWidgetTransformPlugins, webWidgetPlugin } from './transform';
import type { ConfiguredWidgetTransform } from '@/types';

describe('widget transform plugin construction', () => {
  const react: ConfiguredWidgetTransform = {
    name: 'react',
    extensions: ['.tsx', '.jsx'],
    adapter: '@web-widget/react/adapter',
  };

  function exportRenderHandler(plugins: ReturnType<typeof webWidgetPlugin>) {
    const plugin = plugins.find(
      (candidate) => candidate.name === '@web-widget:export-render'
    );
    const transform = plugin?.transform as
      { handler: Function } | Function | undefined;
    if (!transform) throw new Error('Missing export-render transform.');
    return typeof transform === 'function' ? transform : transform.handler;
  }

  const transformContext = {
    error(error: unknown): never {
      throw error instanceof Error ? error : new Error(String(error));
    },
  };

  test('requires at least one transform', () => {
    expect(() => webWidgetPlugin({ transforms: [] })).toThrow(
      '"transforms" is required and must not be empty'
    );
  });

  test('rejects ambiguous unscoped extensions', () => {
    expect(() =>
      createWidgetTransformPlugins(
        {
          transforms: [
            react,
            {
              name: 'preact',
              extensions: ['.tsx'],
              adapter: '@web-widget/preact/adapter',
            },
          ],
        },
        '/project'
      )
    ).toThrow('Extension ".tsx" is used by multiple transforms without scopes');
  });

  test('uses the explicit root to isolate transforms with shared extensions', async () => {
    const plugins = createWidgetTransformPlugins(
      {
        transforms: [
          react,
          {
            name: 'preact',
            extensions: ['.tsx'],
            adapter: '@web-widget/preact/adapter',
            scopes: ['routes/preact'],
          },
        ],
      },
      '/project'
    );
    const exportRenderPlugins = plugins.filter(
      (plugin) => plugin.name === '@web-widget:export-render'
    );
    const reactHandler = exportRenderHandler(exportRenderPlugins.slice(0, 1));
    const preactHandler = exportRenderHandler(exportRenderPlugins.slice(1));
    const code = 'export default function Widget() {}';
    const scopedId = '/project/routes/preact/Card@widget.tsx';

    await expect(
      reactHandler.call(transformContext, code, scopedId)
    ).resolves.toBeNull();
    await expect(
      preactHandler.call(transformContext, code, scopedId)
    ).resolves.toMatchObject({
      code: expect.stringContaining('@web-widget/preact/adapter'),
    });
  });

  test('publishes widget defaults through each module-filter plugin', () => {
    const defaults = { loading: 'idle', root: 'shadow' } as const;
    const plugins = createWidgetTransformPlugins(
      { transforms: [react], defaults },
      '/project'
    );
    const moduleFilter = plugins.find(
      (plugin) => plugin.name === '@web-widget:widget-module-filter'
    );

    expect(moduleFilter?.api).toMatchObject({ defaults });
    expect((moduleFilter?.api as any).filter('/Card@widget.tsx')).toBe(true);
    expect((moduleFilter?.api as any).filter('/Card.tsx')).toBe(false);
  });
});
