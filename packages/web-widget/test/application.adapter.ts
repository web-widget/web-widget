import type { ClientWidgetModule } from '@web-widget/helpers';
import { HTMLWebWidgetElement } from '../src/element';
import { ClientWidgetRenderContext } from '../src/types';

type TestWidgetContainer = {
  getStatusHistory(): string[];
  getStatus(): string;
} & Pick<
  HTMLWebWidgetElement,
  'load' | 'bootstrap' | 'mount' | 'update' | 'unmount' | 'unload'
>;

export function createBaseContainer(
  module: ClientWidgetModule,
  callback: (app: TestWidgetContainer) => Promise<void>
) {
  const widget = document.createElement('web-widget');
  const stateHistory = [widget.status];

  widget.inactive = true;
  widget.addEventListener('statuschange', () => {
    stateHistory.push(widget.status);
  });

  widget.loader = async () => module;

  document.body.appendChild(widget);

  return callback({
    getStatusHistory() {
      return stateHistory;
    },
    getStatus() {
      return widget.status;
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
    },
  });
}

export function createApplication(
  callback: (
    app: TestWidgetContainer & {
      getLifecycleHistory: () => string[];
      getData: () => ClientWidgetRenderContext['data'];
    }
  ) => Promise<void>
) {
  const lifecycleHistory: string[] = [];
  let data: ClientWidgetRenderContext['data'];
  return createBaseContainer(
    {
      render: () => {
        lifecycleHistory.push('load');
        return {
          async bootstrap() {
            lifecycleHistory.push('bootstrap');
          },

          async mount() {
            lifecycleHistory.push('mount');
          },

          async update(updateData) {
            data = updateData;
            lifecycleHistory.push('update');
          },

          async unmount() {
            lifecycleHistory.push('unmount');
          },

          async unload() {
            lifecycleHistory.push('unload');
          },
        };
      },
    },
    (context) =>
      callback({
        ...context,
        getLifecycleHistory() {
          return lifecycleHistory;
        },
        getData() {
          return data;
        },
      })
  );
}

export function defineTimeouts(
  timeouts: Partial<typeof HTMLWebWidgetElement.timeouts>
) {
  Object.assign(HTMLWebWidgetElement.timeouts, timeouts);
}
