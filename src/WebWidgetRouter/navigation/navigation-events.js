/* global window, document, PopStateEvent, setTimeout */
// 这部分代码来自 single-spa，主要是解决浏览器 popstate 事件只能被浏览器默认行为触发的问题

import { isInBrowser } from '../utils/runtime-environment.js';
import { reroute } from './reroute.js';
import { isStarted } from '../start.js';

/* We capture navigation event listeners so that we can make sure
 * that application navigation listeners are not called until
 * single-spa has ensured that the correct applications are
 * unmounted and mounted.
 */
const capturedEventListeners = {
  hashchange: [],
  popstate: []
};

export const routingEventsListeningTo = ['hashchange', 'popstate'];

export function callCapturedEventListeners(eventArguments) {
  if (eventArguments) {
    const eventType = eventArguments[0].type;
    if (routingEventsListeningTo.indexOf(eventType) >= 0) {
      capturedEventListeners[eventType].forEach(listener => {
        try {
          // The error thrown by application event listener should not break single-spa down.
          // Just like https://github.com/single-spa/single-spa/blob/85f5042dff960e40936f3a5069d56fc9477fac04/src/navigation/reroute.js#L140-L146 did
          listener.apply(this, eventArguments);
        } catch (e) {
          setTimeout(() => {
            throw e;
          });
        }
      });
    }
  }
}

let urlRerouteOnly;

export function setUrlRerouteOnly(val) {
  urlRerouteOnly = val;
}

function urlReroute() {
  reroute([], arguments);
}

function createPopStateEvent(state, originalMethodName) {
  // https://github.com/single-spa/single-spa/issues/224 and https://github.com/single-spa/single-spa-angular/issues/49
  // We need a popstate event even though the browser doesn't do one by default when you call replaceState, so that
  // all the applications can reroute. We explicitly identify this extraneous event by setting singleSpa=true and
  // singleSpaTrigger=<pushState|replaceState> on the event instance.
  let evt;
  try {
    evt = new PopStateEvent('popstate', { state });
  } catch (err) {
    // IE 11 compatibility https://github.com/single-spa/single-spa/issues/299
    // https://docs.microsoft.com/en-us/openspecs/ie_standards/ms-html5e/bd560f47-b349-4d2c-baa8-f1560fb489dd
    evt = document.createEvent('PopStateEvent');
    evt.initPopStateEvent('popstate', false, false, state);
  }
  evt.singleSpa = true;
  evt.singleSpaTrigger = originalMethodName;
  return evt;
}

function patchedUpdateState(updateState, methodName) {
  return function () {
    const urlBefore = window.location.href;
    const result = updateState.apply(this, arguments);
    const urlAfter = window.location.href;

    if (!urlRerouteOnly || urlBefore !== urlAfter) {
      if (isStarted()) {
        // fire an artificial popstate event once single-spa is started,
        // so that single-spa applications know about routing that
        // occurs in a different application
        window.dispatchEvent(
          createPopStateEvent(window.history.state, methodName)
        );
      } else {
        // do not fire an artificial popstate event before single-spa is started,
        // since no single-spa applications need to know about routing events
        // outside of their own router.
        reroute([]);
      }
    }

    return result;
  };
}

if (isInBrowser) {
  // We will trigger an app change for any routing events.
  window.addEventListener('hashchange', urlReroute);
  window.addEventListener('popstate', urlReroute);

  // Monkeypatch addEventListener so that we can ensure correct timing
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;
  window.addEventListener = function (eventName, fn) {
    if (typeof fn === 'function') {
      if (
        routingEventsListeningTo.indexOf(eventName) >= 0 &&
        !capturedEventListeners[eventName].find(listener => listener === fn)
      ) {
        capturedEventListeners[eventName].push(fn);
        return;
      }
    }

    // eslint-disable-next-line consistent-return
    return originalAddEventListener.apply(this, arguments);
  };

  window.removeEventListener = function (eventName, listenerFn) {
    if (typeof listenerFn === 'function') {
      if (routingEventsListeningTo.indexOf(eventName) >= 0) {
        capturedEventListeners[eventName] = capturedEventListeners[
          eventName
        ].filter(fn => fn !== listenerFn);
        return;
      }
    }

    // eslint-disable-next-line consistent-return
    return originalRemoveEventListener.apply(this, arguments);
  };

  window.history.pushState = patchedUpdateState(
    window.history.pushState,
    'pushState'
  );

  window.history.replaceState = patchedUpdateState(
    window.history.replaceState,
    'replaceState'
  );
}
