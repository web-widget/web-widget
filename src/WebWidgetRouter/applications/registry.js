import { reroute } from '../navigation/reroute.js';

const MAP = Symbol('map');
class Registry extends Set {
  constructor() {
    super();
    this[MAP] = new Map();
  }

  get(widget) {
    return this[MAP].get(widget);
  }

  register(widget, activeWhen) {
    this.add(widget);
    this[MAP].set(widget, activeWhen);
    reroute();
  }

  unregister(widget) {
    this.delete(widget);
    this[MAP].delete(widget);
  }
}

export const registry = new Registry();
