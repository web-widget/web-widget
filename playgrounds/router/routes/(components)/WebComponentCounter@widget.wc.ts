import styles from '~/routes/(css)/counter.module.css';
import counterStyle from '~/routes/(css)/counter.module.css?inline';

export const meta = { style: [{ content: counterStyle }] };

export default class CounterElement extends HTMLElement {
  static tagName = 'router-playground-counter';
  count = 0;

  connectedCallback() {
    this.update();
  }

  update() {
    this.innerHTML = `<button class="${styles.button}">Web Component count is ${this.count}</button>`;
    this.querySelector('button')?.addEventListener('click', () => {
      this.count += 1;
      this.update();
    });
  }
}
