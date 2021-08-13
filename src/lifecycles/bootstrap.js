import {
  BOOTSTRAP_ERROR,
  BOOTSTRAPPING,
  BOOTSTRAPPED
} from '../applications/status.js';
import { formatErrorMessage } from '../applications/errors.js';
import { reasonableTime } from '../applications/timeouts.js';

export async function toBootstrapPromise(model) {
  if (model && model.bootstrapPromise) {
    return model.bootstrapPromise;
  }

  model.state = BOOTSTRAPPING;
  model.bootstrapPromise = reasonableTime(model, 'bootstrap')
    .then(() => {
      model.state = BOOTSTRAPPED;
    })
    .catch(error => {
      model.state = BOOTSTRAP_ERROR;
      model.bootstrapPromise = null;
      throw formatErrorMessage(model, error);
    });

  return model.bootstrapPromise;
}
