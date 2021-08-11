import { formatErrorMessage } from './errors.js';
import {
  NOT_BOOTSTRAPPED,
  NOT_LOADED,
  LOAD_ERROR,
  NOT_MOUNTED,
  MOUNTED
} from './status.js';

const lifecycles = {
  load: status => status !== NOT_LOADED && status !== LOAD_ERROR,
  bootstrap: status => status !== NOT_BOOTSTRAPPED,
  mount: status => status !== NOT_MOUNTED,
  update: status => status !== MOUNTED,
  unmount: status => status !== MOUNTED,
  unload: status =>
    status === NOT_LOADED || (status !== NOT_MOUNTED && status !== LOAD_ERROR)
};

export function validator(model, lifecycle) {
  const status = model ? model.status : null;

  if (!status) {
    throw new Error(`Cannot ${lifecycle}: Not initialized`);
  }

  if (lifecycles[lifecycle](status)) {
    throw formatErrorMessage(
      model,
      new Error(`Cannot ${lifecycle}: Status: ${status}`)
    );
  }
}
