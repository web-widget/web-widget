export const emptyWidget = document.createElement('web-widget');
Object.freeze(emptyWidget);

export const createWidget = callback => {
  const stack = [];
  const stateStack = [];
  const properties = {};
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.application = () => {
    stack.push('load');
    return {
      async bootstrap(dependencies) {
        properties.bootstrap = dependencies;
        stack.push('bootstrap');
      },

      async mount(dependencies) {
        properties.mount = dependencies;
        stack.push('mount');
      },

      async update(dependencies) {
        properties.update = dependencies;
        stack.push('update');
      },

      async unmount(dependencies) {
        properties.unmount = dependencies;
        stack.push('unmount');
      },

      async unload(dependencies) {
        properties.unload = dependencies;
        stack.push('unload');
      }
    };
  };
  widget.addEventListener('statechange', () => {
    stateStack.push(widget.state);
  });
  document.body.appendChild(widget);
  const results = { stack, stateStack, widget, properties };
  return callback ? callback(results) : results;
};
