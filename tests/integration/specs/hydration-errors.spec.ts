import { expect, test } from '../src/integration-test';

test('reports structured hydration lifecycle errors without unhandled exceptions', async ({
  page,
  browserErrors,
}) => {
  await page.goto('/');

  const details = await page.evaluate(async () => {
    const results: Array<Record<string, unknown>> = [];
    document.addEventListener('web-widget:hydration-error', (event) => {
      const detail = (event as CustomEvent).detail;
      results.push({ ...detail, error: detail.error.message });
    });

    for (const failureAt of ['load', 'bootstrap', 'mount'] as const) {
      const widget = document.createElement('web-widget');
      widget.inactive = true;
      widget.recovering = true;
      widget.renderTarget = 'light';
      widget.import = `/fixtures/${failureAt}.js`;
      widget.setAttribute('adapter', 'fixture');
      const error = new Error(`${failureAt} failed`);
      widget.loader = async () => {
        if (failureAt === 'load') throw error;
        return {
          render: async () => {
            if (failureAt === 'bootstrap') throw error;
            return { mount: async () => Promise.reject(error) };
          },
        };
      };
      document.body.appendChild(widget);

      try {
        await widget.load();
        await widget.bootstrap();
        await widget.mount();
      } catch {}
    }
    return results;
  });

  expect(details).toEqual([
    expect.objectContaining({
      adapter: 'fixture',
      phase: 'module-import',
      error: 'load failed',
    }),
    expect.objectContaining({
      adapter: 'fixture',
      phase: 'adapter-bootstrap',
      error: 'bootstrap failed',
    }),
    expect.objectContaining({
      adapter: 'fixture',
      phase: 'boundary-recovery',
      error: 'mount failed',
    }),
  ]);
  expect(browserErrors.messages).toEqual([]);
});
