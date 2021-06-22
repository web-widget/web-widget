import { queueMicrotask } from './queueMicrotask.js';

const FIRST_CONNECTED = Symbol('firstConnect');
const MOVEING = Symbol('moveing');

export const lifecycleCallbacks = {
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
  },

  disconnectedCallback() {
    this[MOVEING] = true;
    this.lifecycleCallback('disconnected');
    queueMicrotask(() => {
      if (!this.isConnected) {
        this[MOVEING] = false;
        this.lifecycleCallback('destroyed');
      }
    });
  },

  attributeChangedCallback() {
    this.lifecycleCallback('attributeChanged', ...arguments);
  },

  adoptedCallback() {
    this.lifecycleCallback('adopted', ...arguments);
  }
};
