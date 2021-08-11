import { MOUNTED, MOUNT_ERROR } from '../applications/status.js';
import { formatErrorMessage } from '../applications/errors.js';
import { reasonableTime } from '../applications/timeouts.js';
import { validator } from '../applications/validators.js';

export async function toMountPromise(model) {
  if (model && model.mountPromise) {
    return model.mountPromise;
  }

  validator(model, 'mount');

  model.mountPromise = reasonableTime(model, 'mount')
    .then(() => {
      model.status = MOUNTED;
      model.unmountPromise = null;
    })
    .catch(async error => {
      model.status = MOUNT_ERROR;
      model.mountPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.mountPromise;
}
