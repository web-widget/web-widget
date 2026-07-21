import { reportRecoverableError } from './client/hydration-error';

describe('React hydration error reporting', () => {
  test('dispatches a structured mismatch event from the Widget host', () => {
    const host = new EventTarget() as EventTarget & {
      getAttribute(name: string): string | null;
    };
    host.getAttribute = (name) =>
      name === 'import' ? '/widgets/react-counter.js' : null;

    class FakeElement extends EventTarget {
      closest(selector: string) {
        return selector === 'web-widget' ? host : null;
      }
    }
    const previousElement = globalThis.Element;
    Object.assign(globalThis, { Element: FakeElement });
    const container = new FakeElement();
    const original = new Error('hydration mismatch');
    let detail: Record<string, unknown> | undefined;
    host.addEventListener('web-widget:hydration-error', (event) => {
      detail = (event as CustomEvent).detail;
    });

    try {
      reportRecoverableError(container as unknown as Element, original);
    } finally {
      Object.assign(globalThis, { Element: previousElement });
    }

    expect(detail).toEqual({
      moduleURL: '/widgets/react-counter.js',
      adapter: 'react',
      phase: 'mismatch',
      error: original,
    });
  });
});
