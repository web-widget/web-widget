import { UPDATING, MOUNTED, UPDAT_ERROR } from '../applications/status.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';
import { validator } from '../applications/validators.js';

export async function toUpdatePromise(model) {
  validator(model, 'update');

  model.status = UPDATING;
  return reasonableTime(model, 'update')
    .then(() => {
      model.status = MOUNTED;
    })
    .catch(error => {
      model.status = UPDAT_ERROR;
      throw formatErrorMessage(model, error);
    });
}
