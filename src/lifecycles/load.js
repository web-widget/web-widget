import {
  LOAD_ERROR,
  NOT_BOOTSTRAPPED,
  LOADING_SOURCE_CODE,
  NOT_LOADED
} from '../applications/status.js';
import { ensureValidAppTimeouts } from '../applications/timeouts.js';
import { flattenFnArray } from './lifecycle-helpers.js';
import { formatErrorMessage } from '../applications/errors.js';
import { WebWidgetPortalDestinations } from '../WebWidgetPortalDestinations.js';

export async function toLoadPromise(model) {
  if (model.loadPromise) {
    return model.loadPromise;
  }

  if (model.status !== NOT_LOADED && model.status !== LOAD_ERROR) {
    return undefined;
  }

  model.status = LOADING_SOURCE_CODE;
  model.loadPromise = model
    .loader(model.properties)
    .then(main => {
      if (typeof main === 'function') {
        main = main();
      }

      Object.assign(model, {
        bootstrap: flattenFnArray(model, main, 'bootstrap'),
        mount: flattenFnArray(model, main, 'mount'),
        portalRegistry: new WebWidgetPortalDestinations(),
        portalDestinations: [],
        status: NOT_BOOTSTRAPPED,
        timeouts: ensureValidAppTimeouts(main.timeouts),
        unload: flattenFnArray(model, main, 'unload'),
        unmount: flattenFnArray(model, main, 'unmount'),
        update: flattenFnArray(model, main, 'update')
      });
    })
    .catch(error => {
      model.status = LOAD_ERROR;
      model.loadPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.loadPromise;
}
