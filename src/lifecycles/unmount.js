import {
  UNMOUNTING,
  NOT_MOUNTED,
  MOUNTED,
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

  if (model.status !== MOUNTED) {
    return undefined;
  }

  model.status = UNMOUNTING;

  const children = model.children;
  const tryUnmountChildren = children.map(async model =>
    toUnmountPromise(model).catch(error => {
      model.status = SKIP_BECAUSE_BROKEN;
      queueMicrotask(() => {
        throw error;
      });
    })
  );

  model.unmountPromise = Promise.all(tryUnmountChildren).then(() =>
    reasonableTime(model, 'unmount')
      .then(() => {
        model.status = NOT_MOUNTED;
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
