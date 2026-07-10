import { defineServerRender } from '@web-widget/helpers';
import { widget } from './web-widget';

const mockRender = defineServerRender(async (_component, data: any) => {
  return `<div>count: ${data?.count ?? 0}</div>`;
});

function createMockLoader() {
  // The loader source must contain import("...") for parseModuleId
  return () =>
    Promise.resolve({
      default: () => {},
      render: mockRender,
    }) as any;
}

describe('widget', () => {
  test('renders <web-widget> element with innerHTML', async () => {
    const result = await widget(createMockLoader(), {
      import: './Counter@widget.tsx',
      data: { count: 42 },
      name: 'Counter',
    });

    const text = result.toString();
    expect(text).toContain('<web-widget');
    expect(text).toContain('count: 42');
    expect(text).toContain('</web-widget>');
  });

  test('serializes data into contextdata attribute', async () => {
    const result = await widget(createMockLoader(), {
      import: './Counter@widget.tsx',
      data: { count: 7 },
    });

    const text = result.toString();
    expect(text).toContain('"count":7');
  });

  test('includes import attribute for client-side loading', async () => {
    const result = await widget(createMockLoader(), {
      import: './Counter@widget.tsx',
      data: { count: 1 },
    });

    const text = result.toString();
    expect(text).toContain('import="./Counter@widget.tsx"');
  });

  test('returns UnsafeHTML that can be used in templates', async () => {
    const result = await widget(createMockLoader(), {
      import: './Counter@widget.tsx',
      data: { count: 1 },
    });

    // UnsafeHTML has asyncIterator and toString
    expect(typeof result.toString).toBe('function');
    expect(result[Symbol.asyncIterator]).toBeDefined();
  });

  test('propagates render errors', async () => {
    const failingRender = defineServerRender(async () => {
      throw new Error('Widget render failed');
    });
    const failingLoader = () =>
      Promise.resolve({
        default: () => {},
        render: failingRender,
      }) as any;

    await expect(
      widget(failingLoader, { import: './Broken@widget.tsx' })
    ).rejects.toThrow('Widget render failed');
  });
});
