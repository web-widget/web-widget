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
      widget.renderTarget = 'shadow';
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
      widget.createContainer();
      widget.recovering = true;

      try {
        await widget.load();
        await widget.bootstrap();
        await widget.mount();
      } catch {}
    }
    return {
      results,
      shadowRoots: Array.from(
        document.querySelectorAll<HTMLElementTagNameMap['web-widget']>(
          'web-widget[adapter="fixture"]'
        )
      ).map((widget) => ({
        hasMountRoot:
          widget.shadowRoot?.querySelectorAll('web-widget-root').length === 1,
        hasShadowRoot: widget.shadowRoot instanceof ShadowRoot,
      })),
    };
  });

  expect(details.results).toEqual([
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
  expect(details.shadowRoots).toEqual([
    { hasMountRoot: true, hasShadowRoot: true },
    { hasMountRoot: true, hasShadowRoot: true },
    { hasMountRoot: true, hasShadowRoot: true },
  ]);
  expect(browserErrors.messages).toEqual([]);
});
