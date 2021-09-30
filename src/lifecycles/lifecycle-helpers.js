import { formatErrorMessage } from '../applications/errors.js';

function smellsLikeAPromise(promise) {
  return (
    promise &&
    typeof promise.then === 'function' &&
    typeof promise.catch === 'function'
  );
}

export function flattenFnArray(model, main, lifecycle) {
  let fns = main[lifecycle] || (async () => {});
  fns = Array.isArray(fns) ? fns : [fns];
  if (fns.length === 0) {
    fns = [() => Promise.resolve()];
  }

  return function (props) {
    return fns.reduce((resultPromise, fn, index) => {
      return resultPromise.then(() => {
        const thisPromise = fn(props);
        return smellsLikeAPromise(thisPromise)
          ? thisPromise
          : Promise.reject(
              formatErrorMessage(
                model,
                new Error(
                  `The lifecycle function at array index ${index} did not return a promise`
                )
              )
            );
      });
    }, Promise.resolve());
  };
}
