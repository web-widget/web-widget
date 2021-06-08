import { reroute } from '../navigation/reroute.js';

const map = new WeakMap();
export const widgets = new Set();

export function get(widget) {
  return map.get(widget);
}

export function register(widget, activeWhen) {
  widgets.add(widget);
  map.set(widget, activeWhen);
  reroute();
}

export function unregister(widget) {
  widgets.delete(widget);
  map.delete(widget);
}
