import { LitElement, html } from 'lit';

export default class CounterElement extends LitElement {
  static tagName = 'router-playground-lit-counter';
  static properties = { count: { type: Number } };
  declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`<button @click=${() => (this.count += 1)}>
      Lit count is ${this.count}
    </button>`;
  }
}
