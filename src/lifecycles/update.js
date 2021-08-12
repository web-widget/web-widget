import { UPDATING, MOUNTED, UPDAT_ERROR } from '../applications/status.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toUpdatePromise(model) {
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
