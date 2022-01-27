/* global  window, CustomEvent */

/**
 * Dispatches and event and returns whether the state change should be cancelled.
 * The state will be considered as cancelled if the "willChangeState" event was cancelled.
 */
export function shouldCancelChangeState() {
  return !window.dispatchEvent(
    new CustomEvent('willchangestate', { cancelable: true })
  );
}

export function dispatchCustomEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
