import { expect } from '@esm-bundle/chai';
import type { ClientWidgetRenderContext } from '@web-widget/helpers';
import { HTMLWebWidgetElement } from '../src/element.js';

const TEST_WIDGET_FILE =
  '/packages/web-widget/test/widgets/hello-world@widget.js';

declare global {
  interface Window {
    TEST_LIFECYCLE: string;
  }
}

const shadowRoot = Symbol('shadowRoot');
const oldAttachShadow = HTMLElement.prototype.attachShadow;
HTMLElement.prototype.attachShadow = function attachShadow() {
  // @ts-ignore
  this[shadowRoot] = oldAttachShadow.apply(this, arguments);
  // @ts-ignore
  return this[shadowRoot];
};

const createEmptyWidget = async () => {
  const emptyWidget = document.createElement('web-widget');
  await customElements.whenDefined('web-widget');
  return emptyWidget;
};

const createWidget = (
  callback: (app: {
    getStatusHistory(): string[];
    getContext: () => ClientWidgetRenderContext;
    getElement: () => HTMLWebWidgetElement;
  }) => Promise<void>
) => {
  const lifecycleHistory = [];
  const statusHistory: string[] = [];
  let context: ClientWidgetRenderContext;
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.loader = async () => {
    lifecycleHistory.push('load');
    return {
      async render(ctx) {
        context = ctx;
        return {
          async bootstrap() {
            lifecycleHistory.push('bootstrap');
          },

          async mount() {
            lifecycleHistory.push('mount');
          },

          async update() {
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
    };
  };
  widget.addEventListener('statuschange', () => {
    statusHistory.push(widget.status);
  });
  document.body.appendChild(widget);
  return callback({
    getStatusHistory() {
      return statusHistory;
    },
    getElement() {
      return widget;
    },
    getContext() {
      return context;
    },
  });
};

describe('Element default properties', () => {
  it('properties', async () => {
    const emptyWidget = await createEmptyWidget();
    expect(emptyWidget).to.have.property('base', emptyWidget.baseURI);
    expect(emptyWidget).to.have.property('data', null);
    expect(emptyWidget).to.have.property('meta', null);
    expect(emptyWidget).to.have.property('context', null);
    expect(emptyWidget).to.have.property('inactive', false);
    expect(emptyWidget).to.have.property('recovering', false);
    expect(emptyWidget).to.have.property('loading', 'eager');
    expect(emptyWidget).to.have.property(
      'status',
      HTMLWebWidgetElement.INITIAL
    );
    expect(emptyWidget).to.have.property('import', '');
    expect(emptyWidget).to.have.property('renderTarget', 'shadow');
    expect(emptyWidget).to.have.property('loader', null);
  });

  it('methods', async () => {
    const emptyWidget = await createEmptyWidget();
    expect(emptyWidget).to.have.property('load').is.a('function');
    expect(emptyWidget).to.have.property('bootstrap').is.a('function');
    expect(emptyWidget).to.have.property('mount').is.a('function');
    expect(emptyWidget).to.have.property('update').is.a('function');
    expect(emptyWidget).to.have.property('unmount').is.a('function');
    expect(emptyWidget).to.have.property('unload').is.a('function');
  });

  it('hooks', async () => {
    const emptyWidget = await createEmptyWidget();
    expect(emptyWidget).to.have.property('createContext').is.a('function');
    expect(emptyWidget).to.have.property('createContainer').is.a('function');
    expect(emptyWidget).to.have.property('createLoader').is.a('function');
  });
});

describe('Load module', () => {
  it('Load the ES module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.import = TEST_WIDGET_FILE;
    document.body.appendChild(widget);

    return widget.load().then(() => {
      if (window.TEST_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });

  it('Load the function', async () => {
    let element: HTMLElement;
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.loader = async () => ({
      render: ({ container }) => ({
        async bootstrap() {
          element = document.createElement('div');
          element.innerHTML = 'hello world';
        },

        async mount() {
          container.appendChild(element);
        },

        async unmount() {
          container.removeChild(element);
        },
      }),
    });

    document.body.appendChild(widget);

    return widget.load();
  });
});

describe('Load module: error', () => {
  it('Load module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.import = '/test/widgets/404';
    document.body.appendChild(widget);

    return widget.load().then(
      () => Promise.reject(new Error('Not rejected')),
      () => Promise.resolve()
    );
  });

  it('Autoload failure should trigger a global error', () => {
    const globalError = new Promise((resolve, reject) => {
      window.onerror = (error) => {
        reject(error);
      };
    });

    const widget = document.createElement('web-widget');
    widget.import = '/test/widgets2/404';
    document.body.appendChild(widget);

    return globalError.then(
      () => Promise.reject(new Error('Not rejected')),
      () => Promise.resolve()
    );
  });
});

describe('Auto load', () => {
  const src = TEST_WIDGET_FILE;

  it('Connected (import)', (done) => {
    const widget = document.createElement('web-widget');
    widget.addEventListener(
      'statuschange',
      function (this: HTMLWebWidgetElement) {
        if (this.status === HTMLWebWidgetElement.MOUNTED) {
          done();
        }
      }
    );
    widget.import = src;
    document.body.appendChild(widget);
  });

  it('Attribute changed (import)', (done) => {
    const widget = document.createElement('web-widget');
    widget.addEventListener(
      'statuschange',
      function (this: HTMLWebWidgetElement) {
        if (this.status === HTMLWebWidgetElement.MOUNTED) {
          done();
        }
      }
    );
    document.body.appendChild(widget);
    widget.import = src;
  });
});

describe('Application property: container', () => {
  it('container', () =>
    createWidget(async ({ getElement, getContext }) => {
      await getElement().mount();
      expect(getContext().container).to.be.an.instanceof(ShadowRoot);
      await getElement().unload();
      expect(getContext().container).to.be.an.instanceof(ShadowRoot);
    }));
});

describe('Application property: data', () => {
  it('data', () =>
    createWidget(async ({ getElement, getContext }) => {
      const testValue = Date.now();
      // eslint-disable-next-line no-param-reassign
      getElement().data = { testValue };
      await getElement().mount();
      expect(getContext().data).to.have.property('testValue', testValue);
      await getElement().unload();
      expect(getContext().data).to.have.property('testValue', testValue);
    }));

  it('Should support "data" attribute to store JSON content', () =>
    createWidget(async ({ getElement, getContext }) => {
      const data = {
        test: Date.now(),
      };
      getElement().setAttribute('data', JSON.stringify(data));
      await getElement().mount();
      expect(getContext().data).to.deep.equal(data);
      await getElement().unload();
      expect(getContext().data).to.deep.equal(data);
    }));

  it('The priority of attributes and properties should be handled correctly', () =>
    createWidget(async ({ getElement, getContext }) => {
      const arrtData = {
        test: Date.now(),
      };
      const priorityData = {
        test: 'priority',
      };

      // eslint-disable-next-line no-param-reassign
      getElement().data = priorityData;
      getElement().setAttribute('data', JSON.stringify(arrtData));
      await getElement().mount();
      expect(getContext().data).to.deep.equal(arrtData);

      getElement().setAttribute('data', JSON.stringify(arrtData));
      // eslint-disable-next-line no-param-reassign
      getElement().data = priorityData;
      await getElement().unmount();
      await getElement().mount();
      // expect(getContext().data).to.deep.equal(priorityData); // v1.0.0-beta.1: getElement().data 不会再更新
    }));

  it('The content of the "data-*" attribute should be used as the default value', () =>
    createWidget(async ({ getElement, getContext }) => {
      const a = String(Date.now());
      const b = String(Date.now());
      // eslint-disable-next-line no-param-reassign
      getElement().dataset.a = a;
      getElement().setAttribute('data-b', b);
      await getElement().mount();
      expect(getContext().data).to.have.property('a', a);
      expect(getContext().data).to.have.property('b', b);
      await getElement().unload();
      expect(getContext().data).to.have.property('a', a);
      expect(getContext().data).to.have.property('b', b);
    }));
});

describe('Events', () => {
  it('statuschange', () =>
    createWidget(async ({ getStatusHistory, getElement }) => {
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      await getElement().update();
      await getElement().unmount();
      await getElement().unload();
      expect(getStatusHistory()).to.deep.equal([
        HTMLWebWidgetElement.LOADING,
        HTMLWebWidgetElement.LOADED,
        HTMLWebWidgetElement.BOOTSTRAPPING,
        HTMLWebWidgetElement.BOOTSTRAPPED,
        HTMLWebWidgetElement.MOUNTING,
        HTMLWebWidgetElement.MOUNTED,
        HTMLWebWidgetElement.UPDATING,
        HTMLWebWidgetElement.MOUNTED,
        HTMLWebWidgetElement.UNMOUNTING,
        HTMLWebWidgetElement.BOOTSTRAPPED,
        HTMLWebWidgetElement.UNLOADING,
        HTMLWebWidgetElement.INITIAL,
      ]);
    }));
});
