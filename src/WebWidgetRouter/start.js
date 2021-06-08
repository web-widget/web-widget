import { reroute } from './navigation/reroute.js';
import { isInBrowser } from './utils/runtime-environment.js';
import { setUrlRerouteOnly } from './navigation/navigation-events.js';

let started = false;

export function start(options = {}) {
  started = true;
  if (options.urlRerouteOnly) {
    setUrlRerouteOnly(options.urlRerouteOnly);
  }
  if (isInBrowser) {
    reroute();
  }
}

export function isStarted() {
  return started;
}
