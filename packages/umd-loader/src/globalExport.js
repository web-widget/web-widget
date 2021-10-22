/* global window, navigator */
// from https://github.com/systemjs/systemjs/blob/main/src/extras/global.js
const isIE11 =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.indexOf('Trident') !== -1;

function shouldSkipProperty(p, global) {
  return (
    // eslint-disable-next-line no-prototype-builtins
    !global.hasOwnProperty(p) ||
    (!Number.isNaN(p) && p < global.length) ||
    (isIE11 &&
      global[p] &&
      typeof window !== 'undefined' &&
      global[p].parent === window)
  );
}

// safari unpredictably lists some new globals first or second in object order
const firstGlobalProp = '@firstGlobalProp';
const secondGlobalProp = '@secondGlobalProp';
const lastGlobalProp = '@lastGlobalProp';
function getGlobalProp(useFirstGlobalProp, global) {
  let cnt = 0;
  let foundLastProp, result;
  for (const p in global) {
    // do not check frames cause it could be removed during import
    if (shouldSkipProperty(p, global)) continue;
    if (
      (cnt === 0 && p !== global[firstGlobalProp]) ||
      (cnt === 1 && p !== global[secondGlobalProp])
    )
      return p;
    if (foundLastProp) {
      global[lastGlobalProp] = p;
      result = (useFirstGlobalProp && result) || p;
    } else {
      foundLastProp = p === global[lastGlobalProp];
    }
    cnt++;
  }
  return result;
}

export function noteGlobalProps(global) {
  // alternatively Object.keys(global).pop()
  // but this may be faster (pending benchmarks)
  global[firstGlobalProp] = global[secondGlobalProp] = undefined;
  for (const p in global) {
    // do not check frames cause it could be removed during import
    if (shouldSkipProperty(p, global)) continue;
    if (!global[firstGlobalProp]) global[firstGlobalProp] = p;
    else if (!global[secondGlobalProp]) global[secondGlobalProp] = p;
    global[lastGlobalProp] = p;
  }
  return global[lastGlobalProp];
}

// useFirstGlobalProp: https://github.com/systemjs/systemjs/blob/75853dddde25b13244059babc2657a60196c1b13/docs/api.md#systemfirstglobalprop-boolean
export async function getGlobalExport(global, useFirstGlobalProp) {
  // no registration -> attempt a global detection as difference from snapshot
  // when multiple globals, we take the global value to be the last defined new global object property
  // for performance, this will not support multi-version / global collisions as previous SystemJS versions did
  // note in Edge, deleting and re-adding a global does not change its ordering
  const globalProp = getGlobalProp(useFirstGlobalProp, global);
  if (!globalProp) return {};

  let globalExport;
  try {
    globalExport = global[globalProp];
  } catch (e) {
    return {};
  }

  return globalExport;
}
