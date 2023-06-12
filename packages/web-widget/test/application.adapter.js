import { HTMLWebWidgetElement } from '../src/index.js';

export function createBaseContainer({ application }, callback) {
  const widget = document.createElement('web-widget');
  const stateHistory = [widget.state];

  widget.inactive = true;
  widget.addEventListener('statechange', () => {
    stateHistory.push(widget.state);
  });

  widget.application = application;
  document.body.appendChild(widget);

  return callback({
    getStateHistory() {
      return stateHistory;
    },
    getState() {
      return widget.state;
    },
    async load() {
      return widget.load();
    },
    async bootstrap() {
      return widget.bootstrap();
    },
    async mount() {
      return widget.mount();
    },
    async update(properties) {
      return widget.update(properties);
    },
    async unmount() {
      return widget.unmount();
    },
    async unload() {
      return widget.unload();
    }
  });
}

export function createApplication(callback) {
  const lifecycleHistory = [];
  let properties = null;
  return createBaseContainer(
    {
      application() {
        lifecycleHistory.push('load');
        return {
          async bootstrap(props) {
            properties = props;
            lifecycleHistory.push('bootstrap');
          },

          async mount(props) {
            properties = props;
            lifecycleHistory.push('mount');
          },

          async update(props) {
            properties = props;
            lifecycleHistory.push('update');
          },

          async unmount(props) {
            properties = props;
            lifecycleHistory.push('unmount');
          },

          async unload(props) {
            properties = props;
            lifecycleHistory.push('unload');
          }
        };
      }
    },
    context =>
      callback({
        ...context,
        getLifecycleHistory() {
          return lifecycleHistory;
        },
        getProperties() {
          return properties;
        }
      })
  );
}

export function defineTimeouts(timeouts) {
  Object.assign(HTMLWebWidgetElement.timeouts, timeouts);
}
