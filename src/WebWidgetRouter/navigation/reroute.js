/* global location */

import { queueMicrotask } from '../../utils/queueMicrotask.js';
import { registry } from '../applications/registry.js';

const shouldBeActive = widget => {
  const activeWhen = registry.get(widget);
  try {
    // eslint-disable-next-line no-restricted-globals
    return activeWhen(location);
  } catch (error) {
    queueMicrotask(() => {
      throw error;
    });
    return false;
  }
};

const onerror = error => {
  queueMicrotask(() => {
    throw error;
  });
};

const getWidgets = active =>
  [...registry].filter(
    active ? shouldBeActive : widget => !shouldBeActive(widget)
  );

export async function reroute() {
  await Promise.all(
    getWidgets(true).map(widget => widget.bootstrap().catch(onerror))
  );

  await Promise.all(
    getWidgets(false).map(widget => widget.unmount().catch(onerror))
  );

  await Promise.all(
    getWidgets(true).map(widget => widget.mount().catch(onerror))
  );
}
