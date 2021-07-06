import history from 'history/browser';
import { reroute } from './reroute.js';

let initialized;
export function start() {
  if (!initialized) {
    history.listen(() => reroute());
    initialized = true;
  }
  reroute();
}
