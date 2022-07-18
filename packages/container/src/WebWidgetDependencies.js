/* global window */

import deprecated from './utils/deprecated.js';

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

/**
 * @summary Web Widget Dependency Injection
 */
export class WebWidgetDependencies {
  constructor(ownerElement) {
    /**
     * Owner element
     * @name ownerElement
     * @type {HTMLWebWidgetElement}
     */
    Reflect.defineProperty(this, 'ownerElement', {
      get() {
        return ownerElement;
      }
    });
  }

  /**
   * Render target
   * @type {HTMLElement}
   */
  get container() {
    const view = this.ownerElement;

    if (!view.renderRoot) {
      view.renderRoot = view.createRenderRoot();
      ['mount', 'update', 'unmount'].forEach(name => {
        if (!view.renderRoot[name]) {
          view.renderRoot[name] = properties => view[name](properties);
        }
      });
    }

    return view.renderRoot;
  }

  /**
   * Container context interface
   * @type {object}
   */
  get context() {
    deprecated('context', 'Please use "container" instead');
    if (!this[CONTEXT]) {
      this[CONTEXT] = createContext(this.ownerElement);
    }

    return this[CONTEXT];
  }

  /**
   * Create a portal
   * @function
   * @param {HTMLWebWidgetElement}  webWidgetElement Web widget container
   * @param {string}                name             Destination name
   */
  get createPortal() {
    deprecated('createPortal');
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

  /**
   * Application data
   * @type {(object|array)}
   */
  get data() {
    const data = this.ownerElement.data;
    return Array.isArray(data) ? [...data] : { ...data };
  }

  set data(value) {
    this.ownerElement.data = value;
  }

  /**
   * Application name
   * @type {string}
   */
  get name() {
    deprecated('name');
    return this.ownerElement.name;
  }

  /**
   * Application parameters
   * @type {object}
   */
  get parameters() {
    return this.env;
  }

  get env() {
    return [...this.ownerElement.attributes].reduce(
      (accumulator, { name, value }) => {
        accumulator[name] = value;
        return accumulator;
      },
      {}
    );
  }

  /**
   * Sandbox mode
   * @type {boolean}
   */
  get sandboxed() {
    deprecated('sandboxed');
    const { sandboxed } = this.ownerElement;
    return sandboxed;
  }
}

window.WebWidgetDependencies = WebWidgetDependencies;
