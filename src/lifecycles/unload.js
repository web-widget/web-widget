import {
  LOAD_ERROR,
  INITIAL,
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
    portalDestinations: null,
    portals: null,
    state: INITIAL,
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

  model.state = UNLOADING;
  model.unloadPromise = (
    model.state === LOAD_ERROR
      ? Promise.resolve()
      : reasonableTime(model, 'unload')
  )
    .then(() => {
      resetModel(model);
    })
    .catch(error => {
      model.state = UNLOAD_ERROR;
      model.unloadPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.unloadPromise;
}
