import { LOAD_ERROR, LOADED, LOADING } from '../applications/status.js';
import {
  BOOTSTRAP,
  LOAD_PROMISE,
  MOUNT,
  PORTAL_DESTINATIONS,
  PORTALS,
  SET_STATE,
  TIMEOUTS,
  UNLOAD,
  UNMOUNT,
  UPDATE
} from '../applications/symbols.js';
import { ensureValidAppTimeouts } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';
import { createRegistry } from '../utils/registry.js';

function smellsLikeAPromise(promise) {
  return (
    promise &&
    typeof promise.then === 'function' &&
    typeof promise.catch === 'function'
  );
}

function flattenFnArray(view, main, lifecycle) {
  let fns = main[lifecycle] || (async () => {});
  fns = Array.isArray(fns) ? fns : [fns];
  if (fns.length === 0) {
    fns = [() => Promise.resolve()];
  }

  return props =>
    fns.reduce(
      (resultPromise, fn, index) =>
        resultPromise.then(() => {
          const thisPromise = fn(props);
          return smellsLikeAPromise(thisPromise)
            ? thisPromise
            : Promise.reject(
                formatErrorMessage(
                  view,
                  new Error(
                    `The lifecycle function at array index ${index} did not return a promise`
                  )
                )
              );
        }),
      Promise.resolve()
    );
}

export async function toLoadPromise(view) {
  if (view[LOAD_PROMISE]) {
    return view[LOAD_PROMISE];
  }

  view[SET_STATE](LOADING);
  view[LOAD_PROMISE] = view
    .loader(view.dependencies)
    .then(main => {
      if (typeof main === 'function') {
        main = main();
      }

      main = main || {};

      Object.assign(view, {
        [BOOTSTRAP]: flattenFnArray(view, main, 'bootstrap'),
        [MOUNT]: flattenFnArray(view, main, 'mount'),
        [PORTAL_DESTINATIONS]: createRegistry(),
        [PORTALS]: [],
        [TIMEOUTS]: ensureValidAppTimeouts(main.timeouts),
        [UNLOAD]: flattenFnArray(view, main, 'unload'),
        [UNMOUNT]: flattenFnArray(view, main, 'unmount'),
        [UPDATE]: flattenFnArray(view, main, 'update')
      });

      view[SET_STATE](LOADED);
    })
    .catch(error => {
      view[SET_STATE](LOAD_ERROR);
      view[LOAD_PROMISE] = null;
      throw formatErrorMessage(view, error);
    });
  return view[LOAD_PROMISE];
}
