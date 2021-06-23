/* global window */
const MAP = Symbol('data');

export class WebWidgetPortalDestinations {
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

window.WebWidgetPortalDestinations = WebWidgetPortalDestinations;
