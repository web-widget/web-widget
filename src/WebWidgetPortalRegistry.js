const MAP = Symbol('data');

export default class WebWidgetPortalRegistry {
  constructor() {
    this[MAP] = new Map();
  }

  get(name) {
    return this[MAP].get(name);
  }

  define(name, factory) {
    this[MAP].set(name, factory);
  }
}
