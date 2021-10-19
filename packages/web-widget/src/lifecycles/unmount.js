import {
  UNMOUNTING,
  BOOTSTRAPPED,
  UNMOUNT_ERROR
} from '../applications/status.js';
import {
  SET_STATE,
  MOUNT_PROMISE,
  UNMOUNT_PROMISE,
  CHILDREN_WIDGET,
  UNMOUNT
} from '../applications/symbols.js';
import { queueMicrotask } from '../utils/queueMicrotask.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toUnmountPromise(view) {
  if (view[UNMOUNT_PROMISE]) {
    return view[UNMOUNT_PROMISE];
  }

  view[SET_STATE](UNMOUNTING);
  const children = view[CHILDREN_WIDGET]();
  const tryUnmountChildren = children.map(async view =>
    view.unmount().catch(error => {
      queueMicrotask(() => {
        throw error;
      });
    })
  );

  view[UNMOUNT_PROMISE] = Promise.all(tryUnmountChildren).then(() =>
    reasonableTime(view, UNMOUNT)
      .then(() => {
        view[SET_STATE](BOOTSTRAPPED);
        view[MOUNT_PROMISE] = null;
      })
      .catch(error => {
        view[SET_STATE](UNMOUNT_ERROR);
        view[UNMOUNT_PROMISE] = null;
        throw formatErrorMessage(view, error);
      })
  );

  return view[UNMOUNT_PROMISE];
}
