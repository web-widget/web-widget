import { createBrowserHistory } from 'history';
import { reroute } from './reroute.js';

let history;
export function start() {
  if (!history) {
    history = createBrowserHistory();
    history.listen(() => reroute());
  }
  reroute();
}
