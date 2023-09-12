// @ts-nocheck
import { HTMLWebWidgetElement } from "@web-widget/web-widget";

function countNodes(target) {
  let nodes = [target];
  let totalElementsCount = 0;
  let maxDOMTreeDepth = 0;
  let maxChildrenCount = 0;

  while (nodes.length) {
    maxDOMTreeDepth++;
    const children = [];
    for (let node of nodes) {
      totalElementsCount++;
      children.push(...node.children);
      maxChildrenCount = Math.max(maxChildrenCount, node.children.length);
    }
    nodes = children;
  }

  return {
    maxDOMTreeDepth,
    maxChildrenCount,
    totalElementsCount,
  };
}

async function getContentLength(src) {
  return fetch(src, { method: "HEAD" }).then((response) => {
    if (response.ok) {
      const length = response.headers.get("Content-Length");
      return typeof length === "string"
        ? Number(length)
        : Promise.reject(`Missing Content-Length.`);
    } else {
      Promise.reject(response.statusText);
    }
  });
}

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
      const { LOADED, BOOTSTRAPPED, MOUNTED } = HTMLWebWidgetElement;
      const print = () => {
        const label = `web-widget[name=${JSON.stringify(
          this.getAttribute("name")
        )}]`;
        console.groupCollapsed(label);
        console.table(data);
        console.info(this);
        console.groupEnd(label);
      };
      this.addEventListener("statuschange", async () => {
        const now = Date.now();
        if ([LOADED, BOOTSTRAPPED, MOUNTED].includes(this.status)) {
          data[
            {
              [LOADED]: "loadTime",
              [BOOTSTRAPPED]: "bootstrapTime",
              [MOUNTED]: "mountTime",
            }[this.status]
          ] = `${now - time}ms`;

          if (this.status === MOUNTED) {
            if (import.meta.env.DEV) {
              Object.assign(data, {
                moduleSize: `${(
                  (await getContentLength(this.import)) / 1024
                ).toFixed(2)}kb`,
              });
            }
            Object.assign(data, countNodes(this));
            print();
          }
        }
        time = now;
      });
      // eslint-disable-next-line prefer-rest-params
      return value.apply(this, arguments);
    },
  })
);
