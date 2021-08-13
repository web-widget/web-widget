import { formatErrorMessage } from './errors.js';
import {
  LOADED,
  INITIAL,
  LOAD_ERROR,
  BOOTSTRAPPED,
  MOUNTED
} from './status.js';

const lifecycles = {
  load: status => status !== INITIAL && status !== LOAD_ERROR,
  bootstrap: status => status !== LOADED,
  mount: status => status !== BOOTSTRAPPED,
  update: status => status !== MOUNTED,
  unmount: status => status !== MOUNTED,
  unload: status =>
    status === INITIAL || (status !== BOOTSTRAPPED && status !== LOAD_ERROR)
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
