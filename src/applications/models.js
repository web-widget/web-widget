/* global Event */
import { INITIAL } from './status.js';

export class Model {
  constructor({
    children,
    id,
    loader,
    name,
    parent,
    properties,
    sandbox,
    url,
    view
  }) {
    let status = INITIAL;
    Object.assign(this, {
      bootstrap: null,
      bootstrapPromise: null,
      id,
      loader,
      loadPromise: null,
      mount: null,
      mountPromise: null,
      name,
      portalDestinations: null,
      portals: null,
      properties,
      sandbox,
      timeouts: null,
      unload: null,
      unloadPromise: null,
      unmount: null,
      unmountPromise: null,
      update: null,
      url,
      view
    });

    Object.defineProperties(this, {
      children: {
        get() {
          return Object.freeze(children());
        }
      },
      parent: {
        get() {
          return parent();
        }
      },
      status: {
        get() {
          return status;
        },
        set(value) {
          if (value !== status) {
            status = value;
            this.view.dispatchEvent(new Event('change'));
          }
        }
      }
    });

    Object.seal(this);
  }
}
