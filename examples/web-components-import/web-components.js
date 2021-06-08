class MyElment extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const element = document.createElement('div');
    element.innerHTML = `
      <h3><slot name="header">header</slot></h3>
      <p><slot name="main">main</slot></p>
    `;
    this.shadowRoot.appendChild(element);
  }

  connectedCallback() {
    console.log('connectedCallback');
  }

  disconnectedCallback() {
    console.log('disconnectedCallback');
  }

  attributeChangedCallback() {
    console.log('attributeChangedCallback');
  }

  adoptedCallback() {
    console.log('adoptedCallback');
  }
}

window.customElements.define('my-element', MyElment);
console.log(customElements);
