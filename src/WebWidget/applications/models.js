import { NOT_LOADED } from './status.js';

export class Model {
  constructor({
    children,
    container,
    debug,
    id,
    loader,
    name,
    parent,
    properties,
    rootPortalRegistry,
    sandbox,
    shadow,
    url,
    view
  }) {
    Object.assign(this, {
      bootstrap: null,
      bootstrapPromise: null,
      container,
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
      shadow,
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
