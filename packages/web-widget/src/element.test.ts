import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from './element';
import './install';
import type { ClientRenderOptions } from '@web-widget/helpers';

const __FIXTURES__ = '/packages/web-widget/src/__fixtures__/code@widget.js';

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

describe('Race Condition Fix', () => {
  let element: HTMLWebWidgetElement;

  beforeEach(() => {
    element = document.createElement('web-widget');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  it('should prevent multiple autoMount calls with loading="eager"', async () => {
    let loadCallCount = 0;

    // Mock the loader to track calls
    element.loader = async () => {
      loadCallCount++;
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {},
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    // Set loading to eager and import
    element.loading = 'eager';
    element.import = 'test-module';

    // Trigger multiple potential autoMount calls rapidly
    element.setAttribute('contextdata', '{"test": "data1"}');
    element.setAttribute('contextmeta', '{"test": "meta1"}');
    element.setAttribute('loading', 'eager'); // This should not trigger another load
    element.setAttribute('contextdata', '{"test": "data2"}');

    // Wait for all microtasks to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should only have been called once despite multiple triggers
    expect(loadCallCount).to.equal(1);
    expect(element.status).to.equal('mounted');
  });

  it('should allow autoMount after error state', async () => {
    let loadCallCount = 0;

    // Mock the loader to fail first, then succeed
    element.loader = async () => {
      loadCallCount++;
      if (loadCallCount === 1) {
        throw new Error('Load failed');
      }
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {},
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    element.loading = 'eager';
    element.import = 'test-module';

    // Wait for first load to fail
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should be in error state
    expect(element.status).to.equal('load-error');

    // Trigger another autoMount (should work since we're in error state)
    element.setAttribute('contextdata', '{"retry": "data"}');

    // Wait for retry to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have been called twice and succeed
    expect(loadCallCount).to.equal(2);
    expect(element.status).to.equal('mounted');
  });

  it('should handle concurrent loader setting and attribute changes', async () => {
    let loadCallCount = 0;
    const testLoader = async () => {
      loadCallCount++;
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {},
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    element.loading = 'eager';
    element.import = 'test-module';

    // Trigger multiple operations concurrently
    element.loader = testLoader;
    element.setAttribute('contextdata', '{"test": "data"}');
    element.loader = testLoader; // Set again
    element.setAttribute('contextmeta', '{"test": "meta"}');

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should only load once
    expect(loadCallCount).to.equal(1);
    expect(element.status).to.equal('mounted');
  });

  it('should not trigger autoMount when inactive', async () => {
    // Create a completely isolated element for this test
    const isolatedElement = document.createElement('web-widget');

    let loadCallCount = 0;

    // Set attributes first BEFORE adding to DOM
    isolatedElement.loading = 'eager';
    isolatedElement.import = 'test-module';
    isolatedElement.inactive = true; // Set inactive BEFORE adding to DOM

    isolatedElement.loader = async () => {
      loadCallCount++;
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {},
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    // Now add to DOM after setting all attributes
    document.body.appendChild(isolatedElement);

    // Try to trigger autoMount
    isolatedElement.setAttribute('contextdata', '{"test": "data"}');

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not have been called because element is inactive
    expect(loadCallCount).to.equal(0);
    expect(isolatedElement.status).to.equal('initial');

    // Clean up
    document.body.removeChild(isolatedElement);
  });

  it('should handle mount error correctly', async () => {
    let mountCallCount = 0;

    // Mock the loader to succeed load but fail mount initially
    element.loader = async () => {
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {
            mountCallCount++;
            if (mountCallCount === 1) {
              throw new Error('Mount failed');
            }
          },
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    element.loading = 'eager';
    element.import = 'test-module';

    // Wait for first attempt to fail at mount
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should be in mount error state
    expect(element.status).to.equal('mount-error');

    // For mount error, we should retry mount directly, not autoMount
    await element.mount();

    // Should have been called twice and succeed the second time
    expect(mountCallCount).to.equal(2);
    expect(element.status).to.equal('mounted');
  });

  it('should not cause "load from loading to loading" error', async () => {
    let loadCallCount = 0;
    let errorOccurred = false;

    // Listen for the specific error we're trying to prevent
    const originalError = window.onerror;
    window.onerror = (message) => {
      if (
        typeof message === 'string' &&
        message.includes('Cannot perform "load" from "loading" to "loading"')
      ) {
        errorOccurred = true;
      }
      return false;
    };

    element.loader = async () => {
      loadCallCount++;
      // Add small delay to make race condition more likely
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {},
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    element.loading = 'eager';
    element.import = 'test-module';

    // Rapidly trigger multiple changes that could cause race condition
    for (let i = 0; i < 5; i++) {
      element.setAttribute('contextdata', `{"test": "data${i}"}`);
      element.setAttribute('contextmeta', `{"test": "meta${i}"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Restore original error handler
    window.onerror = originalError;

    // Should not have caused the race condition error
    expect(errorOccurred).to.be.false;
    expect(loadCallCount).to.equal(1);
    expect(element.status).to.equal('mounted');
  });

  it('should work correctly with lazy loading', async () => {
    let loadCallCount = 0;

    // Set attributes first before setting loader
    element.loading = 'lazy';
    element.import = 'test-module';

    element.loader = async () => {
      loadCallCount++;
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {},
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    // Trigger attribute changes (should not auto-mount with lazy loading)
    element.setAttribute('contextdata', '{"test": "data"}');

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not have auto-mounted with lazy loading
    expect(loadCallCount).to.equal(0);
    expect(element.status).to.equal('initial');
  });
});
