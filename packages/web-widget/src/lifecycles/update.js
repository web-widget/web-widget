import { UPDATING, MOUNTED, UPDATE_ERROR } from '../applications/status.js';
import { SET_STATE, UPDATE } from '../applications/symbols.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toUpdatePromise(view) {
  view[SET_STATE](UPDATING);
  return reasonableTime(view, UPDATE)
    .then(() => {
      view[SET_STATE](MOUNTED);
    })
    .catch(error => {
      view[SET_STATE](UPDATE_ERROR);
      throw formatErrorMessage(view, error);
    });
}
