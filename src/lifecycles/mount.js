import { MOUNTING, MOUNTED, MOUNT_ERROR } from '../applications/status.js';
import { formatErrorMessage } from '../applications/errors.js';
import { reasonableTime } from '../applications/timeouts.js';

export async function toMountPromise(model) {
  if (model && model.mountPromise) {
    return model.mountPromise;
  }

  model.state = MOUNTING;
  model.mountPromise = reasonableTime(model, 'mount')
    .then(() => {
      model.state = MOUNTED;
      model.unmountPromise = null;
    })
    .catch(async error => {
      model.state = MOUNT_ERROR;
      model.mountPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.mountPromise;
}
