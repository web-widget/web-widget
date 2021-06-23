export { createAttributes } from './attributes.js';
export { createContainer } from './container.js';
export { createContext } from './context.js';
export { createCreatePortal } from './createPortal.js';
export { createCustomPortals } from './customPortals.js';
export { createDataset } from './dataset.js';
export { createName } from './name.js';
export { createSandboxed } from './sandboxed.js';

// 钩子：创建应用生命周期 properties 参数
export function createProperties({ view }) {
  const cache = new Map();
  const HTMLWebWidgetElement = view.constructor;
  const lifecycleProperties = HTMLWebWidgetElement.lifecycleProperties;

  const properties = lifecycleProperties.reduce((accumulator, name) => {
    const hookName = `create-${name}`.replace(/-(\w)/, ($0, $1) =>
      $1.toUpperCase()
    );

    if (typeof view[hookName] !== 'function') {
      throw TypeError(
        `A hook must be a function: ${this.constructor.name}.prototype.${hookName}`
      );
    }

    Reflect.defineProperty(accumulator, name, {
      get() {
        if (cache.has(name)) {
          return cache.get(name);
        }

        const value = view[hookName]();
        cache.set(name, value);
        return value;
      }
    });

    return accumulator;
  }, {});

  return properties;
}

export function toProperties(model) {
  const properties = model.properties;
  const results = model.sandbox
    ? model.sandbox.toVirtual(properties)
    : properties;

  return results;
}
