import { defineServerRender } from '@web-widget/helpers';
import { widget } from './widget';
import { container } from './runtime';

const mockRender = defineServerRender(async (_component, data: any) => {
  return `<div>count: ${data?.count ?? 0}</div>`;
});

function createMockLoader() {
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
    expect(text).toContain('&quot;count&quot;:7');
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

describe('container', () => {
  test('returns a callable function', () => {
    const Counter = container(createMockLoader(), {
      import: './Counter@widget.tsx',
      name: 'Counter',
    });
    expect(typeof Counter).toBe('function');
  });

  test('calling with data renders widget HTML', async () => {
    const Counter = container(createMockLoader(), {
      import: './Counter@widget.tsx',
      name: 'Counter',
    });
    const result = await Counter({ count: 5 });
    const text = result.toString();
    expect(text).toContain('<web-widget');
    expect(text).toContain('count: 5');
  });

  test('widget prop controls loading and renderStage', async () => {
    const Counter = container(createMockLoader(), {
      import: './Counter@widget.tsx',
      name: 'Counter',
    });

    // serverOnly → no import attribute, no recovering
    const serverResult = await Counter({
      count: 99,
      widget: { serverOnly: true },
    });
    const serverText = serverResult.toString();
    expect(serverText).not.toContain('recovering');
    expect(serverText).not.toContain('import=');

    // default → has import and recovering
    const defaultResult = await Counter({ count: 1 });
    const defaultText = defaultResult.toString();
    expect(defaultText).toContain('recovering');
    expect(defaultText).toContain('loading="lazy"');
    expect(defaultText).toContain('rendertarget="light"');
  });
});
