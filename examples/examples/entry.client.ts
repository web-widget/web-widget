// @ts-nocheck
import { HTMLWebWidgetElement } from "@web-widget/web-widget";

function defineHook(target, name, callback) {
  return Reflect.defineProperty(
    target,
    name,
    callback(Reflect.getOwnPropertyDescriptor(target, name))
  );
}

/**
 * Print Web Widget rendering performance information on the client side.
 */
defineHook(
  HTMLWebWidgetElement.prototype,
  "connectedCallback",
  ({ value }) => ({
    value() {
      let time = Date.now();
      const data = {};

      this.addEventListener("statuschange", () => {
        const now = Date.now();
        if (
          [
            HTMLWebWidgetElement.LOADED,
            HTMLWebWidgetElement.BOOTSTRAPPED,
            HTMLWebWidgetElement.MOUNTED,
          ].includes(this.status)
        ) {
          data[this.status] = `${now - time}ms`;
          if (this.status === HTMLWebWidgetElement.MOUNTED) {
            const label = `web-widget[import="${this.import}"] ${HTMLWebWidgetElement.MOUNTED}`;
            console.groupCollapsed(label);
            console.table({
              ...data,
              dom_tree: this.querySelectorAll("*").length,
            });
            console.info(this);
            console.groupEnd(label);
          }
        }
        time = now;
      });
      // eslint-disable-next-line prefer-rest-params
      return value.apply(this, arguments);
    },
  })
);
