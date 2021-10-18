/* global window */
import { formatErrorMessage } from './applications/errors.js';
import {
  PORTAL_DESTINATIONS,
  PORTALS,
  SANDBOX
} from './applications/symbols.js';

function createContext(view) {
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
    const { sandboxed } = view;
    const snandbox = view[SANDBOX];

    if (sandboxed) {
      const sandboxDoc = snandbox.window.document;
      const style = sandboxDoc.createElement('style');
      style.textContent = `body{margin:0}`;
      sandboxDoc.head.appendChild(style);
      return sandboxDoc.body;
    }

    return view.attachShadow({ mode: 'closed' });
  }

  get context() {
    const view = this.ownerElement;
    return createContext(view);
  }

  get createPortal() {
    return (widget, name) => {
      const HTMLWebWidgetElement = this.ownerElement.constructor;
      const view = this.ownerElement;
      let portal;
      const findCustomPortal = (view, name) => {
        let current = view;
        do {
          if (current[PORTAL_DESTINATIONS].get(name)) {
            return current[PORTAL_DESTINATIONS].get(name);
          }
          current = current.parent;
        } while (current);

        return HTMLWebWidgetElement.portalDestinations.get(name);
      };
      const factory = findCustomPortal(view, name);

      if (factory) {
        portal = factory();
      }

      if (!portal) {
        throw formatErrorMessage(
          view,
          new Error(`The portal cannot be found: ${name}`)
        );
      }

      if (!(portal instanceof HTMLWebWidgetElement)) {
        throw formatErrorMessage(
          view,
          new Error(
            `Portal must be an instance of "HTMLWebWidgetElement": ${name}`
          )
        );
      }

      if (this.sandboxed && !widget.isConnected) {
        // Start the sandbox in the current scope
        this.container.appendChild(widget);
      }

      if (!widget.slot) {
        widget.slot = '';
      }

      const oldWidget = portal.querySelector(`[slot="${widget.slot}"]`);

      if (oldWidget) {
        portal.removeChild(oldWidget);
      }

      portal.appendChild(widget);
      portal.mount();
      view[PORTALS].push(portal);

      return createContext(portal);
    };
  }

  get data() {
    const data = this.ownerElement.data;
    return Array.isArray(data) ? [...data] : { ...data };
  }

  set data(value) {
    this.ownerElement.data = value;
  }

  get dataset() {
    return { ...this.ownerElement.dataset };
  }

  get name() {
    return this.ownerElement.name;
  }

  get portalDestinations() {
    const view = this.ownerElement;
    return {
      get() {
        return view[PORTAL_DESTINATIONS].get(...arguments);
      },
      define() {
        return view[PORTAL_DESTINATIONS].define(...arguments);
      }
    };
  }

  get sandboxed() {
    const { sandboxed } = this.ownerElement;
    return sandboxed;
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

['container', 'context', 'createPortal', 'name', 'portalDestinations'].forEach(
  name => {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      WebWidgetDependencies.prototype,
      name
    );
    descriptor.get = memoize(descriptor.get);
    Reflect.defineProperty(WebWidgetDependencies.prototype, name, descriptor);
  }
);

window.WebWidgetDependencies = WebWidgetDependencies;