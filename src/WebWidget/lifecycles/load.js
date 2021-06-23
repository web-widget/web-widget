import {
  LOAD_ERROR,
  NOT_BOOTSTRAPPED,
  LOADING_SOURCE_CODE,
  NOT_LOADED
} from '../applications/status.js';
import { ensureValidAppTimeouts } from '../applications/timeouts.js';
import { flattenFnArray } from './lifecycle-helpers.js';
import { toProperties } from '../properties/properties.js';
import { formatErrorMessage } from '../applications/errors.js';
import WebWidgetPortalDestinations from '../../WebWidgetPortalDestinations.js';

export async function toLoadPromise(model) {
  if (model.loadPromise) {
    return model.loadPromise;
  }

  if (model.status !== NOT_LOADED && model.status !== LOAD_ERROR) {
    return undefined;
  }

  model.status = LOADING_SOURCE_CODE;
  model.loadPromise = model
    .loader(toProperties(model))
    .then((result = {}) => {
      Object.assign(model, {
        bootstrap: flattenFnArray(model, result, 'bootstrap'),
        mount: flattenFnArray(model, result, 'mount'),
        portalRegistry: new WebWidgetPortalDestinations(),
        portalDestinations: [],
        status: NOT_BOOTSTRAPPED,
        timeouts: ensureValidAppTimeouts(result.timeouts),
        unload: flattenFnArray(model, result, 'unload'),
        unmount: flattenFnArray(model, result, 'unmount'),
        update: flattenFnArray(model, result, 'update')
      });
    })
    .catch(error => {
      model.status = LOAD_ERROR;
      model.loadPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.loadPromise;
}
