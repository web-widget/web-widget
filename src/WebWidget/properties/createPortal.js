import { formatErrorMessage } from '../applications/errors.js';

// 钩子：创建传送门方法
export function createCreatePortal(model) {
  const view = model.view;
  const HTMLWebWidgetElement = view.constructor;
  const MODEL = HTMLWebWidgetElement.MODEL;
  return (widget, name) => {
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
