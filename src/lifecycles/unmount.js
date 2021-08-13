import {
  UNMOUNTING,
  BOOTSTRAPPED,
  SKIP_BECAUSE_BROKEN,
  UNMOUNT_ERROR
} from '../applications/status.js';
import { queueMicrotask } from '../utils/queueMicrotask.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toUnmountPromise(model) {
  if (model.unmountPromise) {
    return model.unmountPromise;
  }

  model.status = UNMOUNTING;
  const children = model.children;
  const tryUnmountChildren = children.map(async model =>
    model.view.unmount().catch(error => {
      model.status = SKIP_BECAUSE_BROKEN;
      queueMicrotask(() => {
        throw error;
      });
    })
  );

  model.unmountPromise = Promise.all(tryUnmountChildren).then(() =>
    reasonableTime(model, 'unmount')
      .then(() => {
        model.status = BOOTSTRAPPED;
        model.mountPromise = null;
      })
      .catch(error => {
        model.status = UNMOUNT_ERROR;
        model.unmountPromise = null;
        throw formatErrorMessage(model, error);
      })
  );

  return model.unmountPromise;
}
