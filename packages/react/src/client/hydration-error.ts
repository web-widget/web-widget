const HYDRATION_ERROR_EVENT = 'web-widget:hydration-error';

function hydrationHost(container: Element | DocumentFragment) {
  if (container instanceof Element) return container.closest('web-widget');
  const root = container as ShadowRoot;
  return root.host?.closest('web-widget') ?? null;
}

export function reportRecoverableError(
  container: Element | DocumentFragment,
  error: unknown
) {
  const host = hydrationHost(container);
  (host ?? container).dispatchEvent(
    new CustomEvent(HYDRATION_ERROR_EVENT, {
      bubbles: true,
      composed: true,
      detail: {
        moduleURL: host?.getAttribute('import') ?? '',
        adapter: 'react',
        phase: 'mismatch',
        error,
      },
    })
  );
}
