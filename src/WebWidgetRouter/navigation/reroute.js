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

  widgets.forEach(widget => {
    if (shouldBeActive(widget)) {
      activeList.push(widget);
    } else {
      inactiveList.push(widget);
    }
  });

  const loadPromise = Promise.all(
    activeList.map(widget =>
      widget.bootstrap().catch(error =>
        queueMicrotask(() => {
          throw error;
        })
      )
    )
  );

  await Promise.all(
    inactiveList.map(widget =>
      widget.unmount().catch(error =>
        queueMicrotask(() => {
          throw error;
        })
      )
    )
  );

  await loadPromise;

  await Promise.all(
    activeList
      .filter(widget => shouldBeActive(widget))
      .map(widget =>
        widget.mount().catch(error =>
          queueMicrotask(() => {
            throw error;
          })
        )
      )
  );
}
