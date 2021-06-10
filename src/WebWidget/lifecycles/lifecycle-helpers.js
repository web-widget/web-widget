/* global HTMLWebWidgetElement */
import { formatErrorMessage } from '../applications/errors.js';

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

  const context = {
    unmount() {
      return model.view.unmount();
    }
  };

  const results = {
    get context() {
      return context;
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

      const MODEL = portal.constructor.MODEL;
      const mountPromise = portal.mount();
      model.portals.push(portal[MODEL]);

      return {
        async mount() {
          await mountPromise;
          return portal.mount();
        },
        async unmount() {
          await mountPromise;
          return portal.unmount();
        }
      };
    },
    ...properties
  };

  return model.sandbox ? model.sandbox.toVirtual(results) : results;
}

function smellsLikeAPromise(promise) {
  return (
    promise &&
    typeof promise.then === 'function' &&
    typeof promise.catch === 'function'
  );
}

export function flattenFnArray(model, result, lifecycle) {
  let fns = result[lifecycle] || (async () => {});
  fns = Array.isArray(fns) ? fns : [fns];
  if (fns.length === 0) {
    fns = [() => Promise.resolve()];
  }

  return function (props) {
    return fns.reduce((resultPromise, fn, index) => {
      return resultPromise.then(() => {
        const thisPromise = fn(props);
        return smellsLikeAPromise(thisPromise)
          ? thisPromise
          : Promise.reject(
              formatErrorMessage(
                model,
                new Error(
                  `The lifecycle function at array index ${index} did not return a promise`
                )
              )
            );
      });
    }, Promise.resolve());
  };
}
