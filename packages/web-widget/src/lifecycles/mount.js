import { MOUNTING, MOUNTED, MOUNT_ERROR } from '../applications/status.js';
import {
  MOUNT_PROMISE,
  MOUNT,
  SET_STATE,
  UNMOUNT_PROMISE
} from '../applications/symbols.js';
import { formatErrorMessage } from '../applications/errors.js';
import { reasonableTime } from '../applications/timeouts.js';

export async function toMountPromise(view) {
  if (view[MOUNT_PROMISE]) {
    return view[MOUNT_PROMISE];
  }

  view[SET_STATE](MOUNTING);
  view[MOUNT_PROMISE] = reasonableTime(view, MOUNT)
    .then(() => {
      view[SET_STATE](MOUNTED);
      view[UNMOUNT_PROMISE] = null;
    })
    .catch(async error => {
      view[SET_STATE](MOUNT_ERROR);
      view[MOUNT_PROMISE] = null;
      throw formatErrorMessage(view, error);
    });

  return view[MOUNT_PROMISE];
}
