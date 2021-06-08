/* eslint-disable max-classes-per-file */
/* global window, document, customElements, HTMLWebWidgetImportElement */
import { evaluate } from './utils/script-loader.js';
import { queueMicrotask } from './utils/queue-microtask.js';

function createHTMLElementClassProxy(sandbox) {
  const win = sandbox ? sandbox.global : window;
  const HTMLElement$ = win.HTMLElement;
  const ShadowRoot$ = win.ShadowRoot;

  const creater = (HTMLElement$, ShadowRoot$) => {
    const getDeepPropertyDescriptor = (source, property) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(source, property);
      if (!descriptor) {
        const parentObject = Reflect.getPrototypeOf(source);
        return parentObject
          ? getDeepPropertyDescriptor(parentObject, property)
          : undefined;
      }
      return descriptor;
    };

    const defineShadowRootElement = () => {
      if (customElements.get('shadow-root')) {
        return;
      }

      const ADOPTED_STYLESHEETS = Symbol('adoptedStyleSheets');
      customElements.define(
        'shadow-root',
        class extends HTMLElement$ {
          constructor() {
            super();
            for (const name in this) {
              const descriptor = getDeepPropertyDescriptor(this, name);
              Reflect.defineProperty(this, name, descriptor);
            }

            /* [
              "activeElement",
              "adoptedStyleSheets",
              "delegatesFocus",
              "elementFromPoint",
              "elementsFromPoint",
              "fullscreenElement",
              "getSelection",
              "host",
              "mode",
              "pictureInPictureElement",
              "pointerLockElement",
              "slotAssignment",
              "styleSheets",
            ] */
            Object.defineProperties(this, {
              host: {
                get() {
                  return this.parentNode;
                }
              },
              mode: {
                get() {
                  return this.getAttribute('mode');
                }
              },
              nodeType: {
                get() {
                  return 11;
                }
              },
              nodeName: {
                get() {
                  return '#document-fragment';
                }
              },
              adoptedStyleSheets: {
                set(value) {
                  this[ADOPTED_STYLESHEETS] = value;
                },
                get() {
                  return this[ADOPTED_STYLESHEETS] || [];
                }
              }
            });
          }
        }
      );
    };

    const attachShadow = (host, { mode }) => {
      defineShadowRootElement();
      const shadowRoot = document.createElement('shadow-root');
      shadowRoot.setAttribute(mode, '');

      // 让 Node 拥有 ShadowRoot 的特性，以便兼容第三方库，例如 lit-element
      Reflect.setPrototypeOf(shadowRoot, Object.create(ShadowRoot$.prototype));

      if (mode === 'open') {
        Object.defineProperties(host, {
          shadowRoot: {
            get() {
              return shadowRoot;
            }
          }
        });
      }

      queueMicrotask(() => {
        host.appendChild(shadowRoot);
      });

      return shadowRoot;
    };

    // 避免拦截组件的 shadowDOM 创建，让 WebWidget 可以继续使用插槽
    return class HTMLElementProxy extends HTMLElement$ {
      attachShadow() {
        return attachShadow(this, ...arguments);
      }
    };
  };

  return evaluate(creater, sandbox)(HTMLElement$, ShadowRoot$);
}

function createCustomElementsProxy(sandbox, definedCallback) {
  const win = sandbox ? sandbox.global : window;
  const customElements = win.customElements;
  const get$ = customElements.get.bind(customElements);
  const define$ = customElements.define.bind(customElements);
  const creater = (definedCallback, define$, get$) => (...params) => {
    params[0] = `${params[0]}.private`;
    const name = params[0];
    definedCallback(...params);
    if (!get$(name)) {
      define$(...params);
    }
  };
  return evaluate(creater, sandbox)(definedCallback, define$, get$);
}

function WebComponentsParser(source, sandbox, context = {}) {
  let name;
  const HTMLElementProxy = createHTMLElementClassProxy(sandbox);
  const defineProxy = createCustomElementsProxy(sandbox, tagName => {
    name = tagName;
  });

  const win = sandbox ? sandbox.global : window;
  const HTMLElementRaw = win.HTMLElement;
  const defineRaw = win.customElements.define;

  win.HTMLElement = HTMLElementProxy;
  win.customElements.define = defineProxy;
  evaluate(source, sandbox, context);
  win.HTMLElement = HTMLElementRaw;
  win.customElements.define = defineRaw;

  return ((name, document, element) => ({
    async bootstrap() {
      element = document.createElement(name);
    },
    async mount({ container }) {
      container.appendChild(element);
      const rootNode = container.getRootNode();
      rootNode.adoptedStyleSheets = element.shadowRoot.adoptedStyleSheets;
    },
    async unmount({ container }) {
      container.removeChild(element);
      // const rootNode = container.getRootNode();
      // rootNode.adoptedStyleSheets = [];
    },
    async unload() {
      element = null;
    }
  }))(name, win.document);
}

class HTMLWebComponentImportElement extends HTMLWebWidgetImportElement {
  // eslint-disable-next-line class-methods-use-this
  get [HTMLWebWidgetImportElement.PARSER]() {
    return WebComponentsParser;
  }
}

window.HTMLWebComponentImportElement = HTMLWebComponentImportElement;
customElements.define('web-component.import', HTMLWebComponentImportElement);

export default HTMLWebComponentImportElement;
