/* global window */
import { formatErrorMessage } from './applications/errors.js';

function getModel(target) {
  const view = target.ownerElement;
  const HTMLWebWidgetElement = view.constructor;
  const MODEL = HTMLWebWidgetElement.MODEL;
  const model = view[MODEL];
  return model;
}

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
    return view.attachShadow({ mode: 'closed' });
  }

  get context() {
    const view = this.ownerElement;
    return createContext(view);
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

      if (!widget.slot) {
        widget.slot = '';
      }

      const oldWidget = portal.querySelector(`[slot="${widget.slot}"]`);

      if (oldWidget) {
        portal.removeChild(oldWidget);
      }

      portal.appendChild(widget);
      portal.mount();
      model.portals.push(portal);

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
