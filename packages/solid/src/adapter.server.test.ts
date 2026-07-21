let writable: { write(chunk: string): void; end(): void };

export {};

vi.mock('@web-widget/helpers', () => ({
  defineServerRender: (render: unknown) => render,
}));

vi.mock('@web-widget/web-widget', () => ({
  WebWidgetRenderer: class {},
}));

vi.mock('solid-js/web', () => ({
  Dynamic: () => undefined,
  generateHydrationScript: () => '<script>hydrate</script>',
  renderToStringAsync: vi.fn(),
  renderToStream: () => ({
    pipe(target: typeof writable) {
      writable = target;
      target.write('<div>shell</div>');
    },
  }),
}));

const { render } = await import('./adapter.server');

describe('render (server)', () => {
  test('ignores deferred writes after the consumer cancels the stream', async () => {
    const stream = (await render(
      () => undefined,
      {},
      { progressive: true }
    )) as ReadableStream<string>;
    const reader = stream.getReader();

    expect(await reader.read()).toEqual({
      done: false,
      value: '<script>hydrate</script><div>shell</div>',
    });
    await reader.cancel();

    expect(() => writable.write('<script>deferred</script>')).not.toThrow();
    expect(() => writable.end()).not.toThrow();
  });
});
