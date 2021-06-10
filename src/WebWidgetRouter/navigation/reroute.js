/* global location */

import { queueMicrotask } from '../../utils/queue-microtask.js';
import { registry } from '../applications/registry.js';

function shouldBeActive(widget) {
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
}

export async function reroute() {
  const activeList = [];
  const inactiveList = [];
  function onerror(error) {
    queueMicrotask(() => {
      throw error;
    });
  }

  registry.forEach(widget => {
    if (shouldBeActive(widget)) {
      activeList.push(widget);
    } else {
      inactiveList.push(widget);
    }
  });

  await Promise.all(
    activeList.map(widget => widget.bootstrap().catch(onerror))
  );

  await Promise.all(
    inactiveList
      .filter(widget => !shouldBeActive(widget))
      .map(widget => widget.unmount().catch(onerror))
  );

  await Promise.all(
    activeList
      .filter(widget => shouldBeActive(widget))
      .map(widget => widget.mount().catch(onerror))
  );
}
