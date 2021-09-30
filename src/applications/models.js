/* global Event */
import { INITIAL } from './status.js';

export class Model {
  constructor({ children, id, loader, name, parent, properties, url, view }) {
    let state = INITIAL;
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
      state: {
        get() {
          return state;
        },
        set(value) {
          if (value !== state) {
            state = value;
            this.view.dispatchEvent(new Event('statechange'));
          }
        }
      }
    });

    Object.seal(this);
  }
}
