import type { LitElement } from 'lit';
export type LitComponent = CustomElementConstructor & {
  new (): LitElement;
  tagName: string;
};

export function defineLitElement(component: LitComponent): string {
  if (!component.tagName?.includes('-'))
    throw new TypeError('Lit element classes must declare a static tagName.');
  if (!customElements.get(component.tagName))
    customElements.define(component.tagName, component);
  return component.tagName;
}

export function container(
  loader: () => Promise<{ default: LitComponent }>
): CustomElementConstructor {
  return class LitWidgetContainer extends HTMLElement {
    async connectedCallback() {
      if (this.firstElementChild) return;
      const { default: component } = await loader();
      this.append(document.createElement(defineLitElement(component)));
    }
  };
}
