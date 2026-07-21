/**
 * Converts declarative shadow root templates left unprocessed by the browser.
 * Native DSD parsers consume these templates before this function runs, making
 * it a no-op in supported browsers.
 */
export function attachDeclarativeShadowRoots(
  root: ParentNode = document
): void {
  const templates = Array.from(
    root.querySelectorAll<HTMLTemplateElement>('template[shadowrootmode]')
  );

  for (const template of templates) {
    const host = template.parentElement;
    const mode = template.getAttribute('shadowrootmode');
    if (!host || (mode !== 'open' && mode !== 'closed')) continue;

    let shadowRoot: ShadowRoot;
    try {
      shadowRoot = host.attachShadow({ mode });
    } catch {
      // An open root may already exist when a fragment is processed twice.
      if (!host.shadowRoot) continue;
      shadowRoot = host.shadowRoot;
    }

    const attachInternals = host.attachInternals;
    host.attachInternals = function () {
      if (!attachInternals) {
        return { shadowRoot } as ElementInternals;
      }

      const internals = attachInternals.call(this);
      if (internals.shadowRoot === shadowRoot) return internals;

      try {
        Object.defineProperty(internals, 'shadowRoot', { value: shadowRoot });
        return internals;
      } catch {
        return new Proxy(internals, {
          get(target, property) {
            if (property === 'shadowRoot') return shadowRoot;
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      }
    };

    shadowRoot.appendChild(template.content);
    template.remove();
    attachDeclarativeShadowRoots(shadowRoot);
  }
}
