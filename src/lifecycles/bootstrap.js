import {
  BOOTSTRAPPING,
  NOT_MOUNTED,
  BOOTSTRAPP_ERROR
} from '../applications/status.js';
import { formatErrorMessage } from '../applications/errors.js';
import { reasonableTime } from '../applications/timeouts.js';
import { validator } from '../applications/validators.js';

export async function toBootstrapPromise(model) {
  if (model && model.bootstrapPromise) {
    return model.bootstrapPromise;
  }

  validator(model, 'bootstrap');

  model.status = BOOTSTRAPPING;
  model.bootstrapPromise = reasonableTime(model, 'bootstrap')
    .then(() => {
      model.status = NOT_MOUNTED;
    })
    .catch(error => {
      model.status = BOOTSTRAPP_ERROR;
      model.bootstrapPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.bootstrapPromise;
}
