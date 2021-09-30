import { LOAD_ERROR, LOADED, LOADING } from '../applications/status.js';
import { ensureValidAppTimeouts } from '../applications/timeouts.js';
import { flattenFnArray } from './lifecycle-helpers.js';
import { formatErrorMessage } from '../applications/errors.js';
import { createRegistry } from '../utils/registry.js';

export async function toLoadPromise(model) {
  if (model && model.loadPromise) {
    return model.loadPromise;
  }

  model.state = LOADING;
  model.loadPromise = model
    .loader(model.properties)
    .then(main => {
      if (typeof main === 'function') {
        main = main();
      }

      main = main || {};

      Object.assign(model, {
        bootstrap: flattenFnArray(model, main, 'bootstrap'),
        mount: flattenFnArray(model, main, 'mount'),
        portalDestinations: createRegistry(),
        portals: [],
        state: LOADED,
        timeouts: ensureValidAppTimeouts(main.timeouts),
        unload: flattenFnArray(model, main, 'unload'),
        unmount: flattenFnArray(model, main, 'unmount'),
        update: flattenFnArray(model, main, 'update')
      });
    })
    .catch(error => {
      model.state = LOAD_ERROR;
      model.loadPromise = null;
      throw formatErrorMessage(model, error);
    });
  return model.loadPromise;
}
