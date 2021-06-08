import { NOT_MOUNTED, MOUNTED, MOUNT_ERROR } from '../applications/status.js';
import { reasonableTime } from '../applications/timeouts.js';
import { toUnmountPromise } from './unmount.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toMountPromise(model) {
  if (model.mountPromise) {
    return model.mountPromise;
  }

  if (model.status !== NOT_MOUNTED) {
    return undefined;
  }

  model.mountPromise = reasonableTime(model, 'mount')
    .then(() => {
      model.status = MOUNTED;
      model.unmountPromise = null;
    })
    .catch(async error => {
      model.status = MOUNTED;
      await toUnmountPromise(model);
      model.status = MOUNT_ERROR;
      model.mountPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.mountPromise;
}
