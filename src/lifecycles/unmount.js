import {
  UNMOUNTING,
  BOOTSTRAPPED,
  UNMOUNT_ERROR
} from '../applications/status.js';
import { queueMicrotask } from '../utils/queueMicrotask.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toUnmountPromise(model) {
  if (model.unmountPromise) {
    return model.unmountPromise;
  }

  model.state = UNMOUNTING;
  const children = model.children;
  const tryUnmountChildren = children.map(async model =>
    model.view.unmount().catch(error => {
      queueMicrotask(() => {
        throw error;
      });
    })
  );

  model.unmountPromise = Promise.all(tryUnmountChildren).then(() =>
    reasonableTime(model, 'unmount')
      .then(() => {
        model.state = BOOTSTRAPPED;
        model.mountPromise = null;
      })
      .catch(error => {
        model.state = UNMOUNT_ERROR;
        model.unmountPromise = null;
        throw formatErrorMessage(model, error);
      })
  );

  return model.unmountPromise;
}
