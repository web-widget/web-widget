/* global window */
import { formatErrorMessage } from './applications/errors.js';

function getModel(target) {
  const view = target.ownerElement;
  const HTMLWebWidgetElement = view.constructor;
  const MODEL = HTMLWebWidgetElement.MODEL;
  const model = view[MODEL];
  return model;
}

export class WebWidgetDependencies {
  constructor(ownerElement) {
    Reflect.defineProperty(this, 'ownerElement', {
      get() {
        return ownerElement;
      }
    });
  }

  get attributes() {
    return [...this.ownerElement.attributes].reduce(
      (accumulator, { name, value }) => {
        accumulator[name] = value;
        return accumulator;
      },
      {}
    );
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
      update(properties) {
        return view.update(properties);
      },
      unmount() {
        return view.unmount();
      }
    };
  }

  get createPortal() {
    return (widget, name) => {
      const HTMLWebWidgetElement = this.ownerElement.constructor;
      const model = getModel(this);
      let portal;
      const findCustomPortal = (model, name) => {
        let current = model;
        do {
          if (current.portalDestinations.get(name)) {
            return current.portalDestinations.get(name);
          }
          current = current.parent;
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

      model.portals.push(portal);
      return contextInterfaces;
    };
  }

  get data() {
    return { ...this.ownerElement.data };
  }

  set data(value) {
    this.ownerElement.data = value;
  }

  get dataset() {
    return { ...this.ownerElement.dataset };
  }

  get name() {
    return getModel(this).name;
  }

  get portalDestinations() {
    const model = getModel(this);
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
    return !!getModel(this).sandbox;
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
