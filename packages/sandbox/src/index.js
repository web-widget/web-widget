/* global HTMLWebWidgetElement, WebWidgetSandbox */

import { WebSandbox } from '@web-sandbox.js/web-sandbox/dist/web-sandbox-core.esm.js';

const SANDBOX = Symbol('sandbox');

class Sandbox extends WebWidgetSandbox {
  constructor(ownerElement) {
    super(ownerElement);

    const { csp, id, title } = ownerElement;
    this[SANDBOX] = new WebSandbox(ownerElement, {
      csp,
      id,
      title
    });
  }

  unload() {
    this[SANDBOX].unload();
  }

  get window() {
    return this[SANDBOX].global;
  }
}

HTMLWebWidgetElement.prototype.createSandbox = function () {
  return new Sandbox(this);
};
