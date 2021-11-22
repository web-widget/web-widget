/* global setTimeout, console */

export function reasonableTime(
  callback,
  timeout,
  warning = 1000,
  dieOnTimeout = false
) {
  return new Promise((resolve, reject) => {
    const errorMessage = `Lifecycle function did not complete within ${timeout} ms`;

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
            // eslint-disable-next-line no-console
            console.error(new Error(errorMessage));
            // don't resolve or reject, we're waiting this one out
          }
        } else if (!errored) {
          const numWarnings = shouldError;
          const numMillis = numWarnings * warning;
          // eslint-disable-next-line no-console
          console.warn(new Error(errorMessage));
          if (numMillis + warning < timeout) {
            setTimeout(() => maybeTimingOut(numWarnings + 1), warning);
          }
        }
      }
    }

    setTimeout(() => maybeTimingOut(1), warning);
    setTimeout(() => maybeTimingOut(true), timeout);
  });
}
