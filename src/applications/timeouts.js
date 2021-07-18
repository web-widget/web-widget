/* global setTimeout, console */
import { formatErrorMessage } from './errors.js';

function toProperties(model) {
  const properties = model.properties;
  const results = model.sandbox
    ? model.sandbox.toVirtual(properties)
    : properties;

  return results;
}

const defaultWarningMillis = 1000;

const globalTimeoutConfig = {
  bootstrap: {
    millis: 4000,
    dieOnTimeout: false,
    warningMillis: defaultWarningMillis
  },
  mount: {
    millis: 3000,
    dieOnTimeout: false,
    warningMillis: defaultWarningMillis
  },
  unmount: {
    millis: 3000,
    dieOnTimeout: false,
    warningMillis: defaultWarningMillis
  },
  unload: {
    millis: 3000,
    dieOnTimeout: false,
    warningMillis: defaultWarningMillis
  },
  update: {
    millis: 3000,
    dieOnTimeout: false,
    warningMillis: defaultWarningMillis
  }
};

export function reasonableTime(model, lifecycle) {
  return new Promise((resolve, reject) => {
    const timeoutConfig = model.timeouts[lifecycle];
    const warningPeriod = timeoutConfig.warningMillis;
    const errMsg = `Lifecycle function ${lifecycle} for ${model.name} lifecycle did not resolve or reject for ${timeoutConfig.millis} ms.`;

    let finished = false;
    let errored = false;

    model[lifecycle](toProperties(model))
      .then(val => {
        finished = true;
        resolve(val);
      })
      .catch(val => {
        finished = true;
        reject(val);
      });

    function maybeTimingOut(shouldError) {
      if (!finished) {
        if (shouldError === true) {
          errored = true;
          if (timeoutConfig.dieOnTimeout) {
            reject(formatErrorMessage(model, new Error(errMsg)));
          } else {
            // eslint-disable-next-line no-console
            console.error(formatErrorMessage(model, new Error(errMsg)));
            // don't resolve or reject, we're waiting this one out
          }
        } else if (!errored) {
          const numWarnings = shouldError;
          const numMillis = numWarnings * warningPeriod;
          // eslint-disable-next-line no-console
          console.warn(formatErrorMessage(model, new Error(errMsg)));
          if (numMillis + warningPeriod < timeoutConfig.millis) {
            setTimeout(() => maybeTimingOut(numWarnings + 1), warningPeriod);
          }
        }
      }
    }

    setTimeout(() => maybeTimingOut(1), warningPeriod);
    setTimeout(() => maybeTimingOut(true), timeoutConfig.millis);
  });
}

export function ensureValidAppTimeouts(timeouts) {
  const result = {};

  for (const key in globalTimeoutConfig) {
    result[key] = {
      ...globalTimeoutConfig[key],
      ...((timeouts && timeouts[key]) || {})
    };
  }

  return result;
}
