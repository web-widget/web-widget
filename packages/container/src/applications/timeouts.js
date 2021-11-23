/* eslint-disable no-console */
/* global setTimeout, console */

export function reasonableTime(
  name,
  callback,
  timeout,
  dieOnTimeout = false,
  timeoutWarning = 1000
) {
  return new Promise((resolve, reject) => {
    const errorMessage = `Lifecycle function did not complete within ${timeout} ms: ${name}`;

    let finished = false;
    let errored = false;

    callback()
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
          if (dieOnTimeout) {
            reject(new Error(errorMessage));
          } else {
            console.error(new Error(errorMessage));
          }
        } else if (!errored) {
          const numWarnings = shouldError;
          const numMillis = numWarnings * timeoutWarning;
          console.warn(new Error(errorMessage));
          if (numMillis + timeoutWarning < timeout) {
            setTimeout(() => maybeTimingOut(numWarnings + 1), timeoutWarning);
          }
        }
      }
    }

    if (!dieOnTimeout) {
      setTimeout(() => maybeTimingOut(1), timeoutWarning);
    }

    setTimeout(() => maybeTimingOut(true), timeout);
  });
}
