import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from './element';
import { ClientRenderOptions } from '@web-widget/helpers';

const __FIXTURES__ = '/packages/web-widget/src/__fixtures__/code@widget.js';

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

const createInactiveWidget = (
  callback: (app: {
    getStatusHistory(): string[];
    getContext: () => {
      data: any;
      options: ClientRenderOptions;
    };
    getElement: () => HTMLWebWidgetElement;
  }) => Promise<void>
) => {
  const lifecycleHistory = [];
  const statusHistory: string[] = [];
  let currentData: any;
  let currentOptions: any;
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.loader = async () => {
    lifecycleHistory.push('load');
    return {
      async render(_component, data, options) {
        currentData = data;
        currentOptions = options;
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
      return {
        data: currentData,
        options: currentOptions,
      };
    },
  });
};

describe('Element default properties', () => {
  it('should have default properties', async () => {
    const emptyWidget = await createEmptyWidget();
    const expectedProperties = {
      base: emptyWidget.baseURI,
      data: null,
      contextData: null,
      contextMeta: null,
      inactive: false,
      recovering: false,
      loading: 'eager',
      status: HTMLWebWidgetElement.INITIAL,
      import: '',
      renderTarget: 'shadow',
      loader: null,
    };

    Object.entries(expectedProperties).forEach(([key, value]) => {
      expect(emptyWidget).to.have.property(key, value);
    });
  });

  it('should have default methods', async () => {
    const emptyWidget = await createEmptyWidget();
    const expectedMethods = [
      'load',
      'bootstrap',
      'mount',
      'update',
      'unmount',
      'unload',
    ];

    expectedMethods.forEach((method) => {
      expect(emptyWidget).to.have.property(method).is.a('function');
    });
  });

  it('should have default hooks', async () => {
    const emptyWidget = await createEmptyWidget();
    const expectedHooks = ['createContainer', 'createLoader'];

    expectedHooks.forEach((hook) => {
      expect(emptyWidget).to.have.property(hook).is.a('function');
    });
  });
});

describe('Load module', () => {
  it('should load the ES module', async () => {
    const testData = { test: 'hello world' };
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.import = __FIXTURES__;
    widget.renderTarget = 'light';
    widget.contextData = testData;
    document.body.appendChild(widget);

    await widget.load();
    await widget.bootstrap();
    await widget.mount();

    expect(document.body.innerHTML).to.contains(
      JSON.stringify(testData, null, 2)
    );
  });

  it('should load the function', async () => {
    let element: HTMLElement;
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.loader = async () => ({
      render: (_component, _data, { container }) => ({
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
    await widget.load();
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
  const src = __FIXTURES__;

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
    createInactiveWidget(async ({ getElement, getContext }) => {
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      expect(getContext().options.container).to.be.an.instanceof(ShadowRoot);
      await getElement().unmount();
      await getElement().unload();
      expect(getContext().options.container).to.be.an.instanceof(ShadowRoot);
    }));
});

describe('Application property: data', () => {
  it('should handle data property correctly', () =>
    createInactiveWidget(async ({ getElement, getContext }) => {
      const testValue = Date.now();
      getElement().data = { testValue };
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      expect(getContext().data).to.have.property('testValue', testValue);
      await getElement().unmount();
      await getElement().unload();
      expect(getContext().data).to.have.property('testValue', testValue);
    }));

  it('should support "data" attribute to store JSON content', () =>
    createInactiveWidget(async ({ getElement, getContext }) => {
      const data = { test: Date.now() };
      getElement().setAttribute('data', JSON.stringify(data));
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      expect(getContext().data).to.deep.equal(data);
      await getElement().unmount();
      await getElement().unload();
      expect(getContext().data).to.deep.equal(data);
    }));

  it('should prioritize attributes over properties', () =>
    createInactiveWidget(async ({ getElement, getContext }) => {
      const attrData = { test: Date.now() };
      const propData = { test: 'priority' };

      getElement().data = propData;
      getElement().setAttribute('data', JSON.stringify(attrData));
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      expect(getContext().data).to.deep.equal(attrData);

      getElement().setAttribute('data', JSON.stringify(attrData));
      getElement().data = propData;
      await getElement().unmount();
      await getElement().mount();
    }));

  it('should use "data-*" attributes as default values', () =>
    createInactiveWidget(async ({ getElement, getContext }) => {
      const a = String(Date.now());
      const b = String(Date.now());
      getElement().dataset.a = a;
      getElement().setAttribute('data-b', b);
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      expect(getContext().data).to.include({ a, b });
      await getElement().unmount();
      await getElement().unload();
      expect(getContext().data).to.include({ a, b });
    }));
});

describe('Events', () => {
  it('statuschange', () =>
    createInactiveWidget(async ({ getStatusHistory, getElement }) => {
      expect(getStatusHistory()).to.deep.equal([]);
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      await getElement().update({});
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
