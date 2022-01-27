import { history } from './history.js';
import { shouldCancelChangeState } from './events.js';

export function navigate(to, { replace, state } = {}) {
  if (!shouldCancelChangeState()) {
    if (replace) {
      history.replace(to, state);
    } else {
      history.push(to, state);
    }
  }
}
