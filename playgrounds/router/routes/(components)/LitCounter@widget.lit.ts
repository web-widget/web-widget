import { LitElement, html } from 'lit';
import styles from '~/routes/(css)/counter.module.css';
import counterStyle from '~/routes/(css)/counter.module.css?inline';

export const meta = { style: [{ content: counterStyle }] };

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
    return html`<button
      class=${styles.button}
      @click=${() => (this.count += 1)}>
      Lit count is ${this.count}
    </button>`;
  }
}
