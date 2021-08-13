import { UPDATING, MOUNTED, UPDATE_ERROR } from '../applications/status.js';
import { reasonableTime } from '../applications/timeouts.js';
import { formatErrorMessage } from '../applications/errors.js';

export async function toUpdatePromise(model) {
  model.state = UPDATING;
  return reasonableTime(model, 'update')
    .then(() => {
      model.state = MOUNTED;
    })
    .catch(error => {
      model.state = UPDATE_ERROR;
      throw formatErrorMessage(model, error);
    });
}
