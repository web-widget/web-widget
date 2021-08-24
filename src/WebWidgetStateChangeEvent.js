/* global Event */

const newState = Symbol('newState');
const oldState = Symbol('oldState');
const isFromApplication = Symbol('isFromApplication');

export class WebWidgetStateChangeEvent extends Event {
  constructor(
    type,
    { newState = '', oldState = '', isFromApplication = false } = {}
  ) {
    super(...arguments);
    this[newState] = String(newState);
    this[oldState] = String(oldState);
    this[isFromApplication] = Boolean(isFromApplication);
  }

  get isFromApplication() {
    return this[isFromApplication];
  }

  get newState() {
    return this[newState];
  }

  get oldState() {
    return this[oldState];
  }
}
