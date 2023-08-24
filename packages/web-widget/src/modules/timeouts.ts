export function reasonableTime(
  task: () => Promise<any>,
  timeout: number,
  bail = false,
  errorMessage: string
) {
  return new Promise((resolve, reject) => {
    let finished = false;

    task()
      .then((val) => {
        finished = true;
        resolve(val);
      })
      .catch((val) => {
        finished = true;
        reject(val);
      });

    function maybeTimingOut() {
      if (!finished) {
        if (bail) {
          reject(new Error(errorMessage));
        } else {
          console.error(new Error(errorMessage));
        }
      }
    }

    setTimeout(() => maybeTimingOut(), timeout);
  });
}
