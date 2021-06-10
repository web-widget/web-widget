/* global HTMLWebWidgetElement */

import { reroute } from '../navigation/reroute.js';

function validWidget(widget) {
  if (!(widget instanceof HTMLWebWidgetElement)) {
    throw new TypeError(`Validation failed: not a WebWidget`);
  }
}

function validFunction(fun) {
  if (typeof fun !== 'function') {
    throw new TypeError(`Validation failed: not a function`);
  }
}

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
    validWidget(widget);
    validFunction(activeWhen);

    this.add(widget);
    this[MAP].set(widget, activeWhen);
    reroute();
  }

  unregister(widget) {
    validWidget(widget);
    this.delete(widget);
    this[MAP].delete(widget);
  }
}

export const registry = new Registry();
