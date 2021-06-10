/* global location */

import { queueMicrotask } from '../../utils/queue-microtask.js';
import { widgets, get } from '../applications/widgets.js';

function shouldBeActive(widget) {
  const activeWhen = get(widget);
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

  widgets.forEach(widget => {
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
