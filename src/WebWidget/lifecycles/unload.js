import {
  LOAD_ERROR,
  NOT_LOADED,
  NOT_MOUNTED,
  UNLOADING,
  UNLOAD_ERROR
} from '../applications/status.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

function resetModel(model) {
  Object.assign(model, {
    bootstrap: null,
    bootstrapPromise: null,
    loadPromise: null,
    mount: null,
    mountPromise: null,
    portalRegistry: null,
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
  if (model.unloadPromise) {
    return model.unloadPromise;
  }

  if (model.status === NOT_LOADED) {
    resetModel(model);
    return undefined;
  }

  if (model.status !== NOT_MOUNTED && model.status !== LOAD_ERROR) {
    return undefined;
  }

  model.unloadPromise =
    model.status === LOAD_ERROR
      ? Promise.resolve(model)
      : reasonableTime(model, 'unload');

  model.status = UNLOADING;

  return model.unloadPromise
    .then(() => {
      resetModel(model);
    })
    .catch(error => {
      model.status = UNLOAD_ERROR;
      throw formatErrorMessage(model, error);
    });
}
