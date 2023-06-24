/* global Event */
interface Options extends EventInit {
  value: Record<string, any> | null;
}
export class WebWidgetUpdateEvent extends Event {
  #value;

  constructor(type, init: Options = { value: null }) {
    super(type, init);
    this.#value = init.value;
  }

  get value() {
    return this.#value;
  }
}
