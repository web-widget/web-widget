/* global Event */

const newState = Symbol('newState');
const oldState = Symbol('oldState');
const isContext = Symbol('fromApplication');

export class WebWidgetStateChangeEvent extends Event {
  constructor(type, { newState = '', oldState = '', isContext = false } = {}) {
    super(...arguments);
    this[newState] = String(newState);
    this[oldState] = String(oldState);
    this[isContext] = Boolean(isContext);
  }

  get isContext() {
    return this[isContext];
  }

  get newState() {
    return this[newState];
  }

  get oldState() {
    return this[oldState];
  }
}
