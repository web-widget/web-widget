class MyElment extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const element = document.createElement('div');
    element.innerHTML = `
      <div><slot name="header">header</slot></div>
      <div><slot name="main">main</slot></div>
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
