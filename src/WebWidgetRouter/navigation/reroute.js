/* global location, console */

import { widgets, get } from '../applications/widgets.js';

function shouldBeActive(widget) {
  const activeWhen = get(widget);
  try {
    // eslint-disable-next-line no-restricted-globals
    return activeWhen(location);
  } catch (err) {
    // eslint-disable-next-line no-console, no-undef
    console.error(err);
    return false;
  }
}

export function reroute() {
  const activeList = [];
  const inactiveList = [];

  widgets.forEach((activeWhen, widget) => {
    if (shouldBeActive(widget)) {
      activeList.push(widget);
    } else {
      inactiveList.push(widget);
    }
  });

  Promise.all(activeList.map(widget => widget.bootstrap())).then(() =>
    Promise.all(inactiveList.map(widget => widget.unmount())).then(() => {
      activeList
        .filter(widget => shouldBeActive(widget))
        .forEach(widget => widget.mount());
    })
  );
}
