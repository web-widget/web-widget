import history from 'history/browser';
import { reroute } from './reroute.js';

export { register, unregister } from './registry.js';
export { start } from './start.js';

history.listen(() => reroute());
