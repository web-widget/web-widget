import { NOT_LOADED } from './status.js';

export class Model {
  constructor({
    children,
    debug,
    id,
    loader,
    name,
    parent,
    properties,
    rootPortalRegistry,
    sandbox,
    url,
    view
  }) {
    Object.assign(this, {
      bootstrap: null,
      bootstrapPromise: null,
      debug,
      id,
      loader,
      loadPromise: null,
      mount: null,
      mountPromise: null,
      name,
      portalRegistry: null,
      portals: null,
      properties,
      rootPortalRegistry,
      sandbox,
      status: NOT_LOADED,
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
      }
    });

    Object.seal(this);
  }
}
