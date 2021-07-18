/* global window */
import { formatErrorMessage } from './applications/errors.js';

export class WebWidgetDependencies {
  constructor(ownerElement) {
    this.ownerElement = ownerElement;
  }

  get attributes() {
    const view = this.ownerElement;
    return [...view.attributes].reduce((accumulator, { name, value }) => {
      accumulator[name] = value;
      return accumulator;
    }, {});
  }

  get container() {
    const view = this.ownerElement;
    const HTMLWebWidgetElement = view.constructor;
    const SANDBOX_INSTANCE = HTMLWebWidgetElement.SANDBOX_INSTANCE;
    const sandbox = view[SANDBOX_INSTANCE];

    if (sandbox) {
      const sandboxDoc = sandbox.global.document;
      const style = sandboxDoc.createElement('style');
      style.textContent = `body{margin:0}`;
      sandboxDoc.head.appendChild(style);
      return sandbox.global.document.body;
    }

    return view.attachShadow({ mode: 'closed' });
  }

  get context() {
    const view = this.ownerElement;
    return {
      mount() {
        return view.mount();
      },
      unmount() {
        return view.unmount();
      }
    };
  }

  get createPortal() {
    return (widget, name) => {
      const view = this.ownerElement;
      const HTMLWebWidgetElement = view.constructor;
      const MODEL = HTMLWebWidgetElement.MODEL;
      const model = view[MODEL];
      let portal;
      const findCustomPortal = (model, name) => {
        let current = model;
        do {
          current = current.parent;
          if (current && current.portalRegistry.get(name)) {
            return current.portalRegistry.get(name);
          }
        } while (current);

        return HTMLWebWidgetElement.portalDestinations.get(name);
      };
      const factory = findCustomPortal(model, name);

      if (factory) {
        portal = factory();
      }

      if (!portal) {
        throw formatErrorMessage(
          model,
          new Error(`The portal cannot be found: ${name}`)
        );
      }

      if (!(portal instanceof HTMLWebWidgetElement)) {
        throw formatErrorMessage(
          model,
          new Error(
            `Portal must be an instance of "HTMLWebWidgetElement": ${name}`
          )
        );
      }

      if (model.sandbox && !widget.isConnected) {
        // Start the sandbox in the current scope
        model.properties.container.appendChild(widget);
      }

      if (!widget.slot) {
        widget.slot = '';
      }

      const oldWidget = portal.querySelector(`[slot="${widget.slot}"]`);

      if (oldWidget) {
        portal.removeChild(oldWidget);
      }

      portal.appendChild(widget);

      const mountPromise = portal.mount();
      const contextInterfaces = {
        async mount() {
          await mountPromise;
          return portal.mount();
        },
        async unmount() {
          await mountPromise;
          return portal.unmount();
        }
      };

      model.portalDestinations.push(portal[MODEL]);
      return contextInterfaces;
    };
  }

  get dataset() {
    const view = this.ownerElement;
    const data = {};
    Object.assign(data, view.dataset);
    return data;
  }

  get name() {
    const view = this.ownerElement;
    const HTMLWebWidgetElement = view.constructor;
    const MODEL = HTMLWebWidgetElement.MODEL;
    const model = view[MODEL];
    return model.name;
  }

  get portalDestinations() {
    const view = this.ownerElement;
    const HTMLWebWidgetElement = view.constructor;
    const MODEL = HTMLWebWidgetElement.MODEL;
    const model = view[MODEL];
    return {
      get() {
        return model.portalDestinations.get(...arguments);
      },
      define() {
        return model.portalDestinations.define(...arguments);
      }
    };
  }

  get sandboxed() {
    const view = this.ownerElement;
    const HTMLWebWidgetElement = view.constructor;
    const MODEL = HTMLWebWidgetElement.MODEL;
    const model = view[MODEL];
    return !!model.sandbox;
  }
}

const cache = new WeakMap();
function memoize(func) {
  return function () {
    let contextCache = cache.get(this);
    if (!contextCache) {
      contextCache = new WeakMap();
      cache.set(this, contextCache);
    }

    if (contextCache.has(func)) {
      return contextCache.get(func);
    }

    const result = func.apply(this, arguments);
    contextCache.set(func, result);

    return result;
  };
}

[
  'container',
  'context',
  'createPortal',
  'name',
  'portalDestinations',
  'sandboxed'
].forEach(name => {
  const descriptor = Reflect.getOwnPropertyDescriptor(
    WebWidgetDependencies.prototype,
    name
  );
  descriptor.get = memoize(descriptor.get);
  Reflect.defineProperty(WebWidgetDependencies.prototype, name, descriptor);
});

window.WebWidgetDependencies = WebWidgetDependencies;
