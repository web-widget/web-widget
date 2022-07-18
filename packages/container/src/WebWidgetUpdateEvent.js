/* global Event */

export class WebWidgetUpdateEvent extends Event {
  #value = null;

  constructor(type, init = {}) {
    super(type, init);
    this.#value = init.value;
  }

  get value() {
    return this.#value;
  }
}
