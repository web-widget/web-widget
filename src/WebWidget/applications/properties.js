/* global HTMLWebWidgetElement */
import { formatErrorMessage } from './errors.js';

const cache = new WeakMap();
const findCustomPortal = (model, name) => {
  let current = model;
  do {
    current = current.parent;
    if (current && current.portalRegistry.get(name)) {
      return current.portalRegistry.get(name);
    }
  } while (current);

  return model.rootPortalRegistry.get(name);
};

export function toProperties(model) {
  if (cache.has(model)) {
    return cache.get(model);
  }

  const name = model.name;

  let properties =
    typeof model.properties === 'function'
      ? model.properties(name)
      : model.properties;

  if (
    typeof properties !== 'object' ||
    properties === null ||
    Array.isArray(properties)
  ) {
    properties = {};
  }

  const contextInterfaces = {
    mount() {
      return model.view.mount();
    },
    unmount() {
      return model.view.unmount();
    }
  };

  const api = {
    get context() {
      return contextInterfaces;
    },
    get name() {
      return model.name;
    },
    get container() {
      return model.container;
    },
    get sandboxed() {
      return !!model.sandbox;
    },
    customPortals: {
      get() {
        return model.customPortals.get(...arguments);
      },
      define() {
        return model.customPortals.define(...arguments);
      }
    },
    createPortal(widget, name) {
      let portal;
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
        model.container.appendChild(widget);
      }

      if (!widget.slot) {
        widget.slot = '';
      }

      const oldWidget = portal.querySelector(`[slot="${widget.slot}"]`);

      if (oldWidget) {
        portal.removeChild(oldWidget);
      }

      portal.appendChild(widget);

      const MODEL = HTMLWebWidgetElement.MODEL;
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

      model.portals.push(portal[MODEL]);
      return contextInterfaces;
    },
    ...properties
  };

  const results = model.sandbox ? model.sandbox.toVirtual(api) : api;
  cache.set(model, results);

  return results;
}
