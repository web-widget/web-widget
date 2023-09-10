// @ts-nocheck
import { HTMLWebWidgetElement } from "@web-widget/web-widget";

function countNodes(target) {
  let nodes = [target];
  /** 总节点数 */
  let totalElementsCount = 0;
  /** 最大节点深度 */
  let maxDOMTreeDepth = 0;
  /** 最大子节点数 */
  let maxChildrenCount = 0;

  while (nodes.length) {
    maxDOMTreeDepth++;
    const childs = [];
    for (let node of nodes) {
      totalElementsCount++;
      childs.push(...node.children);
      maxChildrenCount = Math.max(maxChildrenCount, node.children.length);
    }
    nodes = childs;
  }

  return {
    maxDOMTreeDepth,
    maxChildrenCount,
    totalElementsCount,
  };
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
        const label = `web-widget[import="${this.import}"]`;
        console.groupCollapsed(label);
        console.table(data);
        console.info(this);
        console.groupEnd(label);
      };
      this.addEventListener("statuschange", () => {
        const now = Date.now();
        if ([LOADED, BOOTSTRAPPED, MOUNTED].includes(this.status)) {
          data[
            {
              [LOADED]: "loadTime",
              [BOOTSTRAPPED]: "bootstrapTime",
              [MOUNTED]: "mountTime",
            }[this.status]
          ] = now - time;

          if (this.status === MOUNTED) {
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
