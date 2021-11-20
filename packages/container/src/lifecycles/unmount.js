import {
  BOOTSTRAPPED,
  UNMOUNT_ERROR,
  UNMOUNTING
} from '../applications/status.js';
import {
  MOUNT_PROMISE,
  PORTALS,
  SET_STATE,
  UNMOUNT,
  UNMOUNT_PROMISE
} from '../applications/symbols.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toUnmountPromise(view) {
  if (view[UNMOUNT_PROMISE]) {
    return view[UNMOUNT_PROMISE];
  }

  view[SET_STATE](UNMOUNTING);
  view[UNMOUNT_PROMISE] = reasonableTime(view, UNMOUNT)
    .then(() => {
      const portals = view[PORTALS];
      view[SET_STATE](BOOTSTRAPPED);
      view[MOUNT_PROMISE] = null;
      return Promise.all(portals.map(widget => widget.unmount()));
    })
    .catch(error => {
      view[SET_STATE](UNMOUNT_ERROR);
      view[UNMOUNT_PROMISE] = null;
      throw formatErrorMessage(view, error);
    });

  return view[UNMOUNT_PROMISE];
}
