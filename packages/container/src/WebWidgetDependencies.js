/* global window */

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

  get container() {
    const view = this.ownerElement;
    view.renderRoot = view.renderRoot || view.createRenderRoot();

    return view.renderRoot;
  }

  get context() {
    const view = this.ownerElement;
    return createContext(view);
  }

  get createPortal() {
    return (widget, name) => {
      const view = this.ownerElement;
      const HTMLWebWidgetElement = view.constructor;

      const factory = HTMLWebWidgetElement.portalDestinations.get(name);
      const portal = factory ? factory() : null;

      if (!portal) {
        throw new Error(`The portal cannot be found: ${name}`);
      }

      if (!(portal instanceof HTMLWebWidgetElement)) {
        throw new Error(
          `Portal must be an instance of "HTMLWebWidgetElement": ${name}`
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
      view.portals.push(portal);

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

  get name() {
    return this.ownerElement.name;
  }

  get parameters() {
    return [...this.ownerElement.attributes].reduce(
      (accumulator, { name, value }) => {
        accumulator[name] = value;
        return accumulator;
      },
      {}
    );
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

function defineHook(target, name, callback) {
  return Reflect.defineProperty(
    target,
    name,
    callback(Reflect.getOwnPropertyDescriptor(target, name))
  );
}

['container', 'context', 'createPortal', 'name'].forEach(name => {
  defineHook(WebWidgetDependencies.prototype, name, descriptor => {
    descriptor.get = memoize(descriptor.get);
    return descriptor;
  });
});

window.WebWidgetDependencies = WebWidgetDependencies;
