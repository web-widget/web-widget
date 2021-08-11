import {
  LOAD_ERROR,
  NOT_LOADED,
  UNLOADING,
  UNLOAD_ERROR
} from '../applications/status.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';
import { validator } from '../applications/validators.js';

function resetModel(model) {
  Object.assign(model, {
    bootstrap: null,
    bootstrapPromise: null,
    loadPromise: null,
    mount: null,
    mountPromise: null,
    portalDestinations: null,
    portals: null,
    status: NOT_LOADED,
    timeouts: null,
    unload: null,
    unloadPromise: null,
    unmount: null,
    unmountPromise: null,
    update: null
  });
}

export async function toUnloadPromise(model) {
  if (model && model.unloadPromise) {
    return model.unloadPromise;
  }

  validator(model, 'unload');

  model.unloadPromise =
    model.status === LOAD_ERROR
      ? Promise.resolve()
      : reasonableTime(model, 'unload');
  model.status = UNLOADING;
  model.unloadPromise = model.unloadPromise
    .then(() => {
      resetModel(model);
    })
    .catch(error => {
      model.status = UNLOAD_ERROR;
      model.unloadPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.unloadPromise;
}
