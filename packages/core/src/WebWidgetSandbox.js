/* global window */
export class WebWidgetSandbox {
  constructor(ownerElement) {
    Reflect.defineProperty(this, 'ownerElement', {
      get() {
        return ownerElement;
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this
  unload() {}

  // eslint-disable-next-line class-methods-use-this
  get window() {
    return null;
  }
}

window.WebWidgetSandbox = WebWidgetSandbox;
