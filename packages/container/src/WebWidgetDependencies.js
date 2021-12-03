/* global window */

const CONTEXT = Symbol('context');
const CREATE_PORTAL = Symbol('createPortal');

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
    if (!this[CONTEXT]) {
      this[CONTEXT] = createContext(this.ownerElement);
    }

    return this[CONTEXT];
  }

  get createPortal() {
    if (!this[CREATE_PORTAL]) {
      this[CREATE_PORTAL] = (widget, name) => {
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

    return this[CREATE_PORTAL];
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

window.WebWidgetDependencies = WebWidgetDependencies;
