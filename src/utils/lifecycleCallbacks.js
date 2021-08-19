import { queueMicrotask } from './queueMicrotask.js';

const FIRST_CONNECTED = Symbol('firstConnect');
const MOVEING = Symbol('moveing');

export function createLifecycleCallbacks(callbackName) {
  return {
    connectedCallback() {
      this[callbackName]('connected');
      if (!this[FIRST_CONNECTED]) {
        this[callbackName]('firstConnected');
        this[FIRST_CONNECTED] = true;
      } else {
        if (this[MOVEING]) {
          this[callbackName]('moved');
        }
      }
    },

    disconnectedCallback() {
      this[MOVEING] = true;
      this[callbackName]('disconnected');
      queueMicrotask(() => {
        if (!this.isConnected) {
          this[MOVEING] = false;
          this[callbackName]('destroyed');
        }
      });
    },

    attributeChangedCallback() {
      this[callbackName]('attributeChanged', arguments);
    },

    adoptedCallback() {
      this[callbackName]('adopted', arguments);
    }
  };
}
