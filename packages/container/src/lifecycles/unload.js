import {
  LOAD_ERROR,
  INITIAL,
  UNLOADING,
  UNLOAD_ERROR
} from '../applications/status.js';
import {
  SET_STATE,
  BOOTSTRAP_PROMISE,
  BOOTSTRAP,
  LOAD_PROMISE,
  MOUNT_PROMISE,
  MOUNT,
  PORTALS,
  TIMEOUTS,
  UNLOAD_PROMISE,
  UNLOAD,
  UNMOUNT_PROMISE,
  UNMOUNT,
  UPDATE
} from '../applications/symbols.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

function resetView(view) {
  Object.assign(view, {
    [BOOTSTRAP]: null,
    [LOAD_PROMISE]: null,
    [BOOTSTRAP_PROMISE]: null,
    [LOAD_PROMISE]: null,
    [MOUNT]: null,
    [MOUNT_PROMISE]: null,
    [PORTALS]: null,
    [TIMEOUTS]: null,
    [UNLOAD]: null,
    [UNLOAD_PROMISE]: null,
    [UNMOUNT]: null,
    [UNMOUNT_PROMISE]: null,
    [UPDATE]: null
  });

  view[SET_STATE](INITIAL);

  Object.getOwnPropertyNames(view.dependencies).forEach(key => {
    Reflect.deleteProperty(view.dependencies, key);
  });
}

export async function toUnloadPromise(view) {
  if (view[UNLOAD_PROMISE]) {
    return view[UNLOAD_PROMISE];
  }

  view[SET_STATE](UNLOADING);
  view[UNLOAD_PROMISE] = (
    view.state === LOAD_ERROR ? Promise.resolve() : reasonableTime(view, UNLOAD)
  )
    .then(() => {
      resetView(view);
    })
    .catch(error => {
      view[SET_STATE](UNLOAD_ERROR);
      view[UNLOAD_PROMISE] = null;
      throw formatErrorMessage(view, error);
    });

  return view[UNLOAD_PROMISE];
}
