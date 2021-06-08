import {
  NOT_BOOTSTRAPPED,
  BOOTSTRAPPING,
  NOT_MOUNTED,
  BOOTSTRAPP_ERROR
} from '../applications/status.js';
import { formatErrorMessage } from '../applications/errors.js';
import { reasonableTime } from '../applications/timeouts.js';

export async function toBootstrapPromise(model) {
  if (model.bootstrapPromise) {
    return model.bootstrapPromise;
  }

  if (model.status !== NOT_BOOTSTRAPPED) {
    return undefined;
  }

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
