/* global window, HTMLElement, URL */
import { queueMicrotask } from './utils/queue-microtask.js';

const FIRST_CONNECTED = Symbol('first-connect');
const MOVEING = Symbol('moveing');

export default class HTMLWebSandboxBaseInterface extends HTMLElement {
  constructor() {
    super();

    if (typeof this.lifecycleCallback !== 'function') {
      throw new Error('Must implement interface: lifecycleCallback');
    }
  }

  get name() {
    return this.getAttribute('name') || '';
  }

  set name(value) {
    this.setAttribute('name', value);
  }

  get src() {
    const value = this.getAttribute('src');
    return value === null ? '' : new URL(value, this.baseURI).href;
  }

  set src(value) {
    this.setAttribute('src', value);
  }

  get text() {
    return this.getAttribute('text') || '';
  }

  set text(value) {
    this.setAttribute('text', value);
  }

  connectedCallback() {
    this.lifecycleCallback('connected');
    if (!this[FIRST_CONNECTED]) {
      this.lifecycleCallback('firstConnected');
      this[FIRST_CONNECTED] = true;
    } else {
      if (this[MOVEING]) {
        this.lifecycleCallback('moved');
      }
    }
  }

  disconnectedCallback() {
    this[MOVEING] = true;
    this.lifecycleCallback('disconnected');
    queueMicrotask(() => {
      if (!this.isConnected) {
        this[MOVEING] = false;
        this.lifecycleCallback('destroyed');
      }
    });
  }

  attributeChangedCallback() {
    this.lifecycleCallback('attributeChanged', ...arguments);
  }

  adoptedCallback() {
    this.lifecycleCallback('adopted', ...arguments);
  }
}

window.HTMLWebSandboxBaseInterface = HTMLWebSandboxBaseInterface;
