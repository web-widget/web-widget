import type { ClientRenderOptions } from '@web-widget/helpers';
import { expect } from '@esm-bundle/chai';
import { WEB_WIDGET_PENDING_SLOT_NAME } from './constants';
import { HTMLWebWidgetElement } from './element';
import { WEB_WIDGET_PENDING_LOCAL_NAME } from './types';
import './install';

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
      inactive: false,
      recovering: false,
      loading: 'eager',
      status: HTMLWebWidgetElement.INITIAL,
      import: '',
      renderTarget: 'light',
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

describe('Hydration error event', () => {
  const createRecoveringWidget = () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.recovering = true;
    widget.renderTarget = 'light';
    widget.import = '/fixtures/recovering-widget.js';
    widget.setAttribute('adapter', 'test-adapter');
    document.body.appendChild(widget);
    return widget;
  };

  it('reports module import errors with the original error', async () => {
    const widget = createRecoveringWidget();
    const original = new Error('module failed');
    widget.loader = async () => {
      throw original;
    };
    let received: CustomEvent | undefined;
    widget.addEventListener('web-widget:hydration-error', (event) => {
      received = event;
    });

    try {
      await widget.load();
    } catch {}

    expect(received?.detail).to.deep.include({
      moduleURL: `${location.origin}/fixtures/recovering-widget.js`,
      adapter: 'test-adapter',
      phase: 'module-import',
      error: original,
    });
  });

  it('reports adapter bootstrap and boundary recovery phases', async () => {
    for (const [phase, failureAt] of [
      ['adapter-bootstrap', 'bootstrap'],
      ['boundary-recovery', 'mount'],
    ] as const) {
      const widget = createRecoveringWidget();
      const original = new Error(`${failureAt} failed`);
      widget.loader = async () => ({
        render: async () => {
          if (failureAt === 'bootstrap') throw original;
          return { mount: async () => Promise.reject(original) };
        },
      });
      const eventPromise = new Promise<CustomEvent>((resolve) =>
        document.body.addEventListener(
          'web-widget:hydration-error',
          (event) => resolve(event),
          { once: true }
        )
      );

      await widget.load();
      try {
        await widget.bootstrap();
        await widget.mount();
      } catch {}

      const event = await eventPromise;
      expect(event.bubbles).to.equal(true);
      expect(event.composed).to.equal(true);
      expect(event.detail).to.deep.include({ phase, error: original });
    }
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

  it('mounts again after a completed disconnect and reconnect', async () => {
    const widget = document.createElement('web-widget');
    let mounts = 0;
    widget.loader = async () => ({
      render: async () => ({
        mount: async () => {
          mounts++;
        },
      }),
    });
    const waitForStatus = (expected: string) =>
      new Promise<void>((resolve) => {
        if (widget.status === expected) return resolve();
        const onStatusChange = () => {
          if (widget.status === expected) {
            widget.removeEventListener('statuschange', onStatusChange);
            resolve();
          }
        };
        widget.addEventListener('statuschange', onStatusChange);
      });

    document.body.appendChild(widget);
    await waitForStatus(HTMLWebWidgetElement.MOUNTED);
    const shadowRoot = widget.shadowRoot;
    widget.remove();
    await waitForStatus(HTMLWebWidgetElement.INITIAL);
    document.body.appendChild(widget);
    await waitForStatus(HTMLWebWidgetElement.MOUNTED);

    expect(mounts).to.equal(2);
    expect(widget.shadowRoot).to.equal(shadowRoot);
    widget.remove();
  });

  it('lazy loads a recovering widget from visible shadow content', async () => {
    const NativeIntersectionObserver = window.IntersectionObserver;
    let observedTarget: Element | null = null;
    class TestIntersectionObserver {
      #callback: IntersectionObserverCallback;

      constructor(callback: IntersectionObserverCallback) {
        this.#callback = callback;
      }

      observe(target: Element) {
        observedTarget = target;
        queueMicrotask(() =>
          this.#callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          )
        );
      }

      disconnect() {}

      unobserve() {}

      takeRecords() {
        return [];
      }

      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0];
    }
    window.IntersectionObserver =
      TestIntersectionObserver as unknown as typeof IntersectionObserver;

    const widget = document.createElement('web-widget');
    widget.style.display = 'contents';
    widget.loading = 'lazy';
    widget.recovering = true;
    const root = widget.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<web-widget-root style="display:contents">' +
      '<button>visible shadow content</button>' +
      '</web-widget-root>';
    widget.loader = async () => ({
      render: async () => ({ mount: async () => {} }),
    });

    const mounted = new Promise<void>((resolve) => {
      widget.addEventListener('statuschange', () => {
        if (widget.status === HTMLWebWidgetElement.MOUNTED) resolve();
      });
    });
    try {
      document.body.appendChild(widget);
      await mounted;

      expect(observedTarget).to.equal(root.querySelector('button'));
      expect(widget.recovering).to.equal(false);
    } finally {
      widget.remove();
      window.IntersectionObserver = NativeIntersectionObserver;
    }
  });
});

describe('Application property: container', () => {
  it('container', () =>
    createInactiveWidget(async ({ getElement, getContext }) => {
      getElement().renderTarget = 'shadow';
      await getElement().load();
      await getElement().bootstrap();
      await getElement().mount();
      expect(getContext().options.container).to.be.an.instanceof(HTMLElement);
      expect(getContext().options.container.parentNode).to.be.an.instanceof(
        ShadowRoot
      );
      await getElement().unmount();
      await getElement().unload();
      expect(getContext().options.container).to.be.an.instanceof(HTMLElement);
    }));

  it('recovers a declarative shadow mount root without replacing SSR nodes', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.renderTarget = 'shadow';
    widget.recovering = true;
    const root = widget.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style data-web-widget-style="ssr">p{color:red}</style>' +
      '<web-widget-root style="display:contents">' +
      '<p id="ssr-node">server</p>' +
      '</web-widget-root>';
    document.body.appendChild(widget);

    const ssrNode = widget.shadowRoot!.querySelector('#ssr-node');
    const container = widget.createContainer();

    expect(container).to.equal(ssrNode!.parentNode);
    expect(widget.shadowRoot!.querySelector('#ssr-node')).to.equal(ssrNode);
    expect(
      widget.shadowRoot!.querySelector('[data-web-widget-style="ssr"]')
    ).not.to.equal(null);
    widget.remove();
  });

  it('keeps SSR CSS when dev hydration transfers only the style id', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.renderTarget = 'shadow';
    widget.recovering = true;
    widget.setAttribute('devstyles', JSON.stringify(['/src/counter.css']));
    const root = widget.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style data-web-widget-style="/src/counter.css">' +
      '.count{color:red}' +
      '</style>' +
      '<web-widget-root style="display:contents">' +
      '<button class="count">1</button>' +
      '</web-widget-root>';
    document.body.appendChild(widget);

    widget.createContainer();

    expect(
      root.querySelector<HTMLStyleElement>(
        'style[data-web-widget-style="/src/counter.css"]'
      )?.textContent
    ).to.equal('.count{color:red}');
    widget.remove();
  });

  it('rejects recovery when the declarative shadow root is missing', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.renderTarget = 'shadow';
    widget.recovering = true;
    document.body.appendChild(widget);

    expect(() => widget.createContainer()).to.throw(
      'declarative ShadowRoot is missing'
    );
    widget.remove();
  });

  it('does not mistake an application slot for the boundary pending slot', () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.renderTarget = 'shadow';
    widget.innerHTML = '<div slot="web-widget-pending">Loading</div>';
    const root = widget.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<web-widget-root style="display:contents">' +
      '<section><slot name="web-widget-pending"></slot></section>' +
      '</web-widget-root>';
    document.body.appendChild(widget);

    const container = widget.createContainer();
    const boundarySlots = Array.from(root.children).filter(
      (element) =>
        element.localName === 'slot' &&
        element.getAttribute('name') === 'web-widget-pending'
    );

    expect(boundarySlots).to.have.length(0);
    expect(root.firstElementChild).to.equal(container);
    expect(widget.firstElementChild?.getAttribute('slot')).to.equal(
      'web-widget-pending'
    );
    widget.remove();
  });

  it('creates a pending slot for the lifecycle-owned pending element', () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.renderTarget = 'shadow';
    const pending = document.createElement(WEB_WIDGET_PENDING_LOCAL_NAME);
    pending.slot = WEB_WIDGET_PENDING_SLOT_NAME;
    widget.append(pending);
    const root = widget.attachShadow({ mode: 'open' });
    document.body.appendChild(widget);

    const container = widget.createContainer();
    const pendingSlot = Array.from(root.children).find(
      (element) =>
        element.localName === 'slot' &&
        element.getAttribute('name') === WEB_WIDGET_PENDING_SLOT_NAME
    );

    expect(pendingSlot?.nextElementSibling).to.equal(container);
    widget.remove();
  });

  it('does not create a pending slot without pending content', () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.renderTarget = 'shadow';
    const root = widget.attachShadow({ mode: 'open' });
    document.body.appendChild(widget);

    widget.createContainer();

    expect(root.querySelector('slot[name="web-widget-pending"]')).to.equal(
      null
    );
    widget.remove();
  });

  it('installs widget styles before the client renderer bootstraps', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.renderTarget = 'shadow';
    let styleWasInstalled = false;
    widget.loader = async () => ({
      meta: {
        style: [{ id: 'client-style', content: '.client { color: green; }' }],
      },
      render: async (_component, _data, { container }) => {
        const root = container.getRootNode() as ShadowRoot;
        styleWasInstalled = !!root.querySelector(
          '[data-web-widget-style="client-style"]'
        );
        return {};
      },
    });
    document.body.appendChild(widget);

    await widget.load();
    await widget.bootstrap();

    expect(styleWasInstalled).to.equal(true);
    expect(
      widget.shadowRoot!.querySelector(
        'style[data-web-widget-style="client-style"]'
      )?.textContent
    ).to.equal('.client { color: green; }');
    widget.remove();
  });
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
  it('clears pending boundary on mounting', () =>
    createInactiveWidget(async ({ getElement }) => {
      const widget = getElement();
      const pending = document.createElement(WEB_WIDGET_PENDING_LOCAL_NAME);
      pending.slot = WEB_WIDGET_PENDING_SLOT_NAME;
      pending.textContent = 'pending';
      widget.append(pending);

      await widget.load();
      await widget.bootstrap();
      expect(pending.isConnected).to.equal(true);

      await widget.mount();
      expect(pending.isConnected).to.equal(false);
    }));

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
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Restore original error handler
    window.onerror = originalError;

    // Should not have caused the race condition error
    expect(errorOccurred).to.equal(false);
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
