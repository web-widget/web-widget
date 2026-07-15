export default class CounterElement extends HTMLElement {
  static tagName = 'router-playground-counter';
  count = 0;

  connectedCallback() {
    this.update();
  }

  update() {
    this.innerHTML = `<button>Web Component count is ${this.count}</button>`;
    this.querySelector('button')?.addEventListener('click', () => {
      this.count += 1;
      this.update();
    });
  }
}
