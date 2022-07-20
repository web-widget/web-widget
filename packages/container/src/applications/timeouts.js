/* eslint-disable no-console */
/* global setTimeout, console */

export function reasonableTime(
  task,
  timeout,
  dieOnTimeout = false,
  errorMessage
) {
  return new Promise((resolve, reject) => {
    let finished = false;

    task()
      .then(val => {
        finished = true;
        resolve(val);
      })
      .catch(val => {
        finished = true;
        reject(val);
      });

    function maybeTimingOut() {
      if (!finished) {
        if (dieOnTimeout) {
          reject(new Error(errorMessage()));
        } else {
          console.error(new Error(errorMessage()));
        }
      }
    }

    setTimeout(() => maybeTimingOut(), timeout);
  });
}
