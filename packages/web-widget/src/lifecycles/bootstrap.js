import {
  BOOTSTRAP_ERROR,
  BOOTSTRAPPING,
  BOOTSTRAPPED
} from '../applications/status.js';
import {
  SET_STATE,
  BOOTSTRAP_PROMISE,
  BOOTSTRAP
} from '../applications/symbols.js';
import { formatErrorMessage } from '../applications/errors.js';
import { reasonableTime } from '../applications/timeouts.js';

export async function toBootstrapPromise(view) {
  if (view[BOOTSTRAP_PROMISE]) {
    return view[BOOTSTRAP_PROMISE];
  }

  view[SET_STATE](BOOTSTRAPPING);
  view[BOOTSTRAP_PROMISE] = reasonableTime(view, BOOTSTRAP)
    .then(() => {
      view[SET_STATE](BOOTSTRAPPED);
    })
    .catch(error => {
      view[SET_STATE](BOOTSTRAP_ERROR);
      view[BOOTSTRAP_PROMISE] = null;
      throw formatErrorMessage(view, error);
    });

  return view[BOOTSTRAP_PROMISE];
}
