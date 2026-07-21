export type WebComponent =
  string | (CustomElementConstructor & { tagName: string });

export function resolveTagName(component: WebComponent): string {
  if (typeof component === 'string') return component;
  const tagName = component.tagName;
  if (!tagName?.includes('-'))
    throw new TypeError('Web component classes must declare a static tagName.');
  if (!customElements.get(tagName)) customElements.define(tagName, component);
  return tagName;
}

export function widget(
  loader: () => Promise<{ default: WebComponent }>
): CustomElementConstructor {
  return class WebWidgetContainer extends HTMLElement {
    async connectedCallback() {
      if (this.firstElementChild) return;
      const { default: component } = await loader();
      this.append(document.createElement(resolveTagName(component)));
    }
  };
}
