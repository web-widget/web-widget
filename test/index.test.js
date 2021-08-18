import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from '../src/index.js';
import { globalTimeoutConfig } from '../src/applications/timeouts.js';
import { emptyWidget, createWidget } from './utils.js';

describe('The default properties of the element', () => {
  it('properties', () => {
    expect(emptyWidget).to.have.property('application', null);
    expect(emptyWidget).to.have.property('inactive', false);
    expect(emptyWidget).to.have.property('importance', 'auto');
    expect(emptyWidget).to.have.property('loading', 'auto');
    expect(emptyWidget).to.have.property('sandboxed', false);
    expect(emptyWidget).to.have.property('type', '');
    expect(emptyWidget).to.have.property('state', HTMLWebWidgetElement.INITIAL);
    expect(emptyWidget).to.have.property('name', '');
    expect(emptyWidget).to.have.property('src', '');
    expect(emptyWidget).to.have.property('text', '');
  });

  it('methods', () => {
    expect(emptyWidget).to.have.property('load').is.a('function');
    expect(emptyWidget).to.have.property('bootstrap').is.a('function');
    expect(emptyWidget).to.have.property('mount').is.a('function');
    expect(emptyWidget).to.have.property('update').is.a('function');
    expect(emptyWidget).to.have.property('unmount').is.a('function');
    expect(emptyWidget).to.have.property('unload').is.a('function');
  });

  it('hooks', () => {
    expect(emptyWidget).to.have.property('createDependencies').is.a('function');
    expect(emptyWidget).to.have.property('loader').is.a('function');
    expect(emptyWidget).to.have.property('createSandbox').is.a.a('function');
    expect(HTMLWebWidgetElement)
      .to.have.property('portalDestinations')
      .is.a('object');
  });
});

describe('Load module', () => {
  it('Load the UMD module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.src = '/test/widgets/hello-world.umd.widget.js';
    document.body.appendChild(widget);

    return widget.load();
  });

  it('Load the ES module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.type = 'module';
    widget.src = '/test/widgets/hello-world.esm.widget.js';
    document.body.appendChild(widget);

    return widget.load();
  });

  it('Load the ES module: local', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.type = 'module';
    widget.text = `
      let element;
  
      export default () => ({
        async bootstrap() {
          element = document.createElement('div');
          element.innerHTML = 'hello wrold';
        },
      
        async mount({ container }) {
          container.appendChild(element);
        },
      
        async unmount({ container }) {
          container.removeChild(element);
        }
      });
    `;
    document.body.appendChild(widget);

    return widget.load();
  });

  it('Load the function', async () => {
    let element;
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.application = () => ({
      async bootstrap() {
        element = document.createElement('div');
        element.innerHTML = 'hello wrold';
      },

      async mount({ container }) {
        container.appendChild(element);
      },

      async unmount({ container }) {
        container.removeChild(element);
      }
    });
    document.body.appendChild(widget);

    return widget.load();
  });
});

describe('Auto load', () => {
  const src = '/test/widgets/hello-world.umd.widget.js';
  const text = `
    let element;

    export default () => ({
      async bootstrap() {
        element = document.createElement('div');
        element.innerHTML = 'hello wrold';
      },
    
      async mount({ container }) {
        container.appendChild(element);
      },
    
      async unmount({ container }) {
        container.removeChild(element);
      }
    });
  `;
  const application = element => ({
    async bootstrap() {
      element = document.createElement('div');
      element.innerHTML = 'hello wrold';
    },

    async mount({ container }) {
      container.appendChild(element);
    },

    async unmount({ container }) {
      container.removeChild(element);
    }
  });

  it('Connected (src)', done => {
    const widget = document.createElement('web-widget');
    widget.addEventListener('statechange', function () {
      if (this.state === HTMLWebWidgetElement.MOUNTED) {
        done();
      }
    });
    widget.src = src;
    document.body.appendChild(widget);
  });

  it('Attribute changed (src)', done => {
    const widget = document.createElement('web-widget');
    widget.addEventListener('statechange', function () {
      if (this.state === HTMLWebWidgetElement.MOUNTED) {
        done();
      }
    });
    document.body.appendChild(widget);
    widget.src = src;
  });

  it('Connected (text)', done => {
    const widget = document.createElement('web-widget');
    widget.type = 'module';
    widget.text = text;
    widget.addEventListener('statechange', function () {
      if (this.state === HTMLWebWidgetElement.MOUNTED) {
        done();
      }
    });
    document.body.appendChild(widget);
  });

  it('Property changed (text)', done => {
    const widget = document.createElement('web-widget');
    widget.type = 'module';
    widget.addEventListener('statechange', function () {
      if (this.state === HTMLWebWidgetElement.MOUNTED) {
        done();
      }
    });
    document.body.appendChild(widget);
    widget.text = text;
  });

  it('Connected (application)', done => {
    const widget = document.createElement('web-widget');
    widget.addEventListener('statechange', function () {
      if (this.state === HTMLWebWidgetElement.MOUNTED) {
        done();
      }
    });
    widget.application = application;
    document.body.appendChild(widget);
  });

  it('Property changed (application)', done => {
    const widget = document.createElement('web-widget');
    widget.addEventListener('statechange', function () {
      if (this.state === HTMLWebWidgetElement.MOUNTED) {
        done();
      }
    });
    document.body.appendChild(widget);
    widget.application = application;
  });
});

describe('Application lifecycle: load', () => {
  it('load', () =>
    createWidget(async ({ stack, widget }) => {
      const promise = widget.load();
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
      expect(stack).to.deep.equal(['load']);
    }));

  it('Loading should not be repeated', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.load();
      widget.load();
      widget.load();
      await widget.load();
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
      expect(stack).to.deep.equal(['load']);
    }));
});

describe('Application lifecycle: bootstrap', () => {
  it('bootstrap', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      const promise = widget.bootstrap();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal(['load', 'bootstrap']);
    }));

  it('It should load automatically before bootstraping', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.bootstrap();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal(['load', 'bootstrap']);
    }));

  it('Mounting should not be repeated', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.bootstrap();
      widget.bootstrap();
      widget.bootstrap();
      await widget.bootstrap();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal(['load', 'bootstrap']);
    }));
});

describe('Application lifecycle: mount', () => {
  it('mount', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.bootstrap();
      const promise = widget.mount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
      await widget.mount();
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
    }));

  it('It should bootstrap automatically before mounting', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.mount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
    }));

  it('Mounting should not be repeated', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.mount();
      await widget.mount();
      widget.mount();
      widget.mount();
      await widget.mount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
    }));
});

describe('Application lifecycle: update', () => {
  it('update', () =>
    createWidget(async ({ stack, widget, properties }) => {
      const testValue = Date.now();
      await widget.load();
      await widget.bootstrap();
      await widget.mount();
      const promise = widget.update({ testValue });
      expect(widget.state).to.equal(HTMLWebWidgetElement.UPDATING);
      await promise;
      expect(properties.update).to.have.property('testValue', testValue);
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'update']);
    }));

  it('If it is not loaded, the update should be rejected', () =>
    createWidget(({ stack, widget }) =>
      widget.update().then(
        () => Promise.reject(new Error('Not rejected')),
        () => {
          expect(stack).to.deep.equal([]);
        }
      )
    ));

  it('If it is not bootstraped, the update should be rejected', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.update().then(
        () => Promise.reject(new Error('Not rejected')),
        () => {
          expect(stack).to.deep.equal(['load']);
        }
      );
    }));

  it('If it is not mounted, the update should be rejected', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.bootstrap();
      await widget.update().then(
        () => Promise.reject(new Error('Not rejected')),
        () => {
          expect(stack).to.deep.equal(['load', 'bootstrap']);
        }
      );
    }));

  it('Continuous updates should be allowed', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.mount();
      await widget.update();
      await widget.update();
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
      expect(stack).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
        'update',
        'update'
      ]);
    }));
});

describe('Application lifecycle: unmount', () => {
  it('unmount', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.bootstrap();
      await widget.mount();
      const promise = widget.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.UNMOUNTING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'unmount']);
    }));

  it('If it is not loaded, it should not be unmount', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
      expect(stack).to.deep.equal([]);
    }));

  it('If it is not bootstraped, it should not be unmount', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
      expect(stack).to.deep.equal(['load']);
    }));

  it('If it is not mounted, it should not be unmount', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.bootstrap();
      await widget.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal(['load', 'bootstrap']);
    }));

  it('Unmounting should not be repeated', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.mount();
      await widget.unmount();
      widget.unmount();
      widget.unmount();
      await widget.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'unmount']);
    }));
});

describe('Application lifecycle: unload', () => {
  it('unload', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.bootstrap();
      await widget.mount();
      await widget.unmount();
      const promise = widget.unload();
      expect(widget.state).to.equal(HTMLWebWidgetElement.UNLOADING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
      expect(stack).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
        'unmount',
        'unload'
      ]);
    }));

  it('Updated data should be cleaned up', () =>
    createWidget(async ({ widget, properties }) => {
      const testValue = Date.now();
      await widget.mount();
      await widget.update({ testValue });
      expect(properties.update).to.have.property('testValue', testValue);
      await widget.unmount();
      expect(properties.unmount).to.have.property('testValue', testValue);
      await widget.unload();
      expect(properties.unmount).to.not.have.property('testValue');
    }));

  it('If it is not loaded, it should not be unload', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.unload();
      expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
      expect(stack).to.deep.equal([]);
    }));

  it('If it is not bootstraped, it should not be unload', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.load();
      await widget.unload();
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
      expect(stack).to.deep.equal(['load']);
    }));

  it('If it has been bootstraped, it should be allowed to unload', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.bootstrap();
      await widget.unload();
      expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'unload']);
    }));

  it('If it has been mounted, it should be unmount before being unload', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.mount();
      await widget.unload();
      expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
      expect(stack).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
        'unmount',
        'unload'
      ]);
    }));

  it('Unloading should not be repeated', () =>
    createWidget(async ({ stack, widget }) => {
      await widget.mount();
      await widget.unload();
      widget.unload();
      widget.unload();
      await widget.unload();
      expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
      expect(stack).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
        'unmount',
        'unload'
      ]);
    }));

  it('After unloading, the load should be allowed to continue', () =>
    createWidget(async ({ stateStack, stack, widget }) => {
      let promise;
      await widget.mount();
      await widget.unload();
      stack.length = 0;
      stateStack.length = 0;

      promise = widget.load();
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
      expect(stack).to.deep.equal(['load']);

      promise = widget.bootstrap();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal(['load', 'bootstrap']);

      promise = widget.mount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);

      promise = widget.update();
      expect(widget.state).to.equal(HTMLWebWidgetElement.UPDATING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'update']);

      promise = widget.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.UNMOUNTING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      expect(stack).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
        'update',
        'unmount'
      ]);

      promise = widget.unload();
      expect(widget.state).to.equal(HTMLWebWidgetElement.UNLOADING);
      await promise;
      expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
      expect(stack).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
        'update',
        'unmount',
        'unload'
      ]);
    }));
});

describe('Application lifecycle: error', () => {
  function createError(lifecycle, callback) {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.application = () => {
      return {
        [lifecycle]: async () => Promise.reject()
      };
    };
    document.body.appendChild(widget);
    return callback({ widget });
  }

  it('bootstrap', () =>
    createError('bootstrap', async ({ widget }) => {
      await widget.bootstrap().then(
        () => Promise.reject(new Error('Not rejected')),
        () => Promise.resolve()
      );
    }));

  it('mount', () =>
    createError('mount', async ({ widget }) => {
      await widget.mount().then(
        () => Promise.reject(new Error('Not rejected')),
        () => Promise.resolve()
      );
    }));

  it('update', () =>
    createError('update', async ({ widget }) => {
      await widget.mount();
      await widget.update().then(
        () => Promise.reject(new Error('Not rejected')),
        () => Promise.resolve()
      );
    }));

  it('unmount', () =>
    createError('unmount', async ({ widget }) => {
      await widget.mount();
      await widget.unmount().then(
        () => Promise.reject(new Error('Not rejected')),
        () => Promise.resolve()
      );
    }));

  it('unload', () =>
    createError('unload', async ({ widget }) => {
      await widget.mount();
      await widget.unmount();
      await widget.unload().then(
        () => Promise.reject(new Error('Not rejected')),
        () => Promise.resolve()
      );
    }));
});

describe('Application lifecycle: timeout', () => {
  function createTimeoutError(lifecycle, callback) {
    const config = globalTimeoutConfig[lifecycle];
    config.millis = 50;
    config.dieOnTimeout = true;

    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.application = () => {
      return {
        [lifecycle]() {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve();
            }, config.millis + 16);
          });
        }
      };
    };
    document.body.appendChild(widget);
    return callback({ widget });
  }

  it('bootstrap', () =>
    createTimeoutError('bootstrap', async ({ widget }) => {
      await widget.bootstrap().then(
        () => Promise.reject(new Error('Not rejected')),
        () => Promise.resolve()
      );
    }));
});

describe('Application property: attributes', () => {
  it('attributes', () =>
    createWidget(async ({ widget, properties }) => {
      const value = String(Date.now());
      widget.setAttribute('test', value);
      await widget.mount();
      expect(properties.mount.attributes).to.have.property('test', value);
      await widget.unload();
      expect(properties.mount.attributes).to.have.property('test', value);
    }));
});

describe('Application property: container', () => {
  it('container', () =>
    createWidget(async ({ widget, properties }) => {
      await widget.mount();
      expect(properties.mount.container).to.be.an.instanceof(ShadowRoot);
      await widget.unload();
      expect(properties.mount.container).to.be.an.instanceof(ShadowRoot);
    }));
});

describe('Application property: context', () => {
  it('context', () =>
    createWidget(async ({ widget, properties }) => {
      await widget.mount();
      await properties.mount.context.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      await properties.mount.context.mount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
    }));
});

describe('Application property: data', () => {
  it('data', () =>
    createWidget(async ({ widget, properties }) => {
      const testValue = Date.now();
      widget.data = { testValue };
      await widget.mount();
      expect(properties.mount.data).to.have.property('testValue', testValue);
      await widget.unload();
      expect(properties.mount.data).to.have.property('testValue', testValue);
    }));

  it('Should support "data" attribute to store JSON content', () =>
    createWidget(async ({ widget, properties }) => {
      const data = {
        test: Date.now()
      };
      widget.setAttribute('data', JSON.stringify(data));
      await widget.mount();
      expect(properties.mount.data).to.deep.equal(data);
      await widget.unload();
      expect(properties.mount.data).to.deep.equal(data);
    }));

  it('The priority of attributes and properties should be handled correctly', () =>
    createWidget(async ({ widget, properties }) => {
      const arrtData = {
        test: Date.now()
      };
      const priorityData = {
        test: 'priority'
      };

      widget.data = priorityData;
      widget.setAttribute('data', JSON.stringify(arrtData));
      await widget.mount();
      expect(properties.mount.data).to.deep.equal(arrtData);

      widget.setAttribute('data', JSON.stringify(arrtData));
      widget.data = priorityData;
      await widget.unmount();
      await widget.mount();
      expect(properties.mount.data).to.deep.equal(priorityData);
    }));

  it('The content of the "data-*" attribute should be used as the default value', () =>
    createWidget(async ({ widget, properties }) => {
      const a = String(Date.now());
      const b = String(Date.now());
      widget.dataset.a = a;
      widget.setAttribute('data-b', b);
      await widget.mount();
      expect(properties.mount.data).to.have.property('a', a);
      expect(properties.mount.data).to.have.property('b', b);
      await widget.unload();
      expect(properties.mount.data).to.have.property('a', a);
      expect(properties.mount.data).to.have.property('b', b);
    }));
});

describe('Application property: dataset', () => {
  it('dataset', () =>
    createWidget(async ({ widget, properties }) => {
      const value = String(Date.now());
      widget.setAttribute('data-test', value);
      await widget.mount();
      expect(properties.mount.dataset).to.have.property('test', value);
      await widget.unload();
      expect(properties.mount.dataset).to.have.property('test', value);
    }));
});

describe('Application property: name', () => {
  it('name', () =>
    createWidget(async ({ widget, properties }) => {
      const value = String(Date.now());
      widget.name = value;
      await widget.mount();
      expect(properties.mount).to.have.property('name', value);
      await widget.unload();
      expect(properties.mount).to.have.property('name', value);
    }));
});

describe('Application property: sandboxed', () => {
  it('sandboxed', () =>
    createWidget(async ({ widget, properties }) => {
      await widget.mount();
      expect(properties.mount).to.have.property('sandboxed', false);
      await widget.unload();
      expect(properties.mount).to.have.property('sandboxed', false);
    }));
});

describe('Events', () => {
  it('statechange', () =>
    createWidget(async ({ stateStack, widget }) => {
      await widget.load();
      await widget.bootstrap();
      await widget.mount();
      await widget.update();
      await widget.unmount();
      await widget.unload();
      expect(stateStack).to.deep.equal([
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
        HTMLWebWidgetElement.INITIAL
      ]);
    }));
});

describe('Placeholder', () => {
  it('placeholder', () =>
    createWidget(async ({ widget }) => {
      const placeholder = document.createElement('placeholder');
      widget.appendChild(placeholder);
      await widget.load();
      expect(placeholder).to.have.property('hidden', false);
      await widget.bootstrap();
      expect(placeholder).to.have.property('hidden', false);
      await widget.mount();
      expect(placeholder).to.have.property('hidden', true);
    }));

  it('Only works on the first placeholder element', () =>
    createWidget(async ({ widget }) => {
      const placeholder1 = document.createElement('placeholder');
      const placeholder2 = document.createElement('placeholder');
      widget.appendChild(placeholder1);
      widget.appendChild(placeholder2);
      await widget.load();
      expect(placeholder1).to.have.property('hidden', false);
      expect(placeholder2).to.have.property('hidden', false);
      await widget.bootstrap();
      expect(placeholder1).to.have.property('hidden', false);
      expect(placeholder2).to.have.property('hidden', false);
      await widget.mount();
      expect(placeholder1).to.have.property('hidden', true);
      expect(placeholder2).to.have.property('hidden', false);
    }));

  it('The placeholder element must be a direct descendant', () =>
    createWidget(async ({ widget }) => {
      const child = document.createElement('div');
      const placeholder = document.createElement('placeholder');
      const placeholder2 = document.createElement('placeholder');
      child.appendChild(placeholder);
      widget.appendChild(child);
      widget.appendChild(placeholder2);
      await widget.load();
      expect(placeholder).to.have.property('hidden', false);
      expect(placeholder2).to.have.property('hidden', false);
      await widget.bootstrap();
      expect(placeholder).to.have.property('hidden', false);
      expect(placeholder2).to.have.property('hidden', false);
      await widget.mount();
      expect(placeholder).to.have.property('hidden', false);
      expect(placeholder2).to.have.property('hidden', true);
    }));

  it('Change visibility only once', () =>
    createWidget(async ({ widget }) => {
      const placeholder = document.createElement('placeholder');
      widget.appendChild(placeholder);
      await widget.load();
      expect(placeholder).to.have.property('hidden', false);
      await widget.bootstrap();
      expect(placeholder).to.have.property('hidden', false);
      await widget.mount();
      expect(placeholder).to.have.property('hidden', true);
      await widget.update();
      expect(placeholder).to.have.property('hidden', true);
      await widget.unmount();
      expect(placeholder).to.have.property('hidden', true);
      await widget.unload();
      expect(placeholder).to.have.property('hidden', true);
      await widget.load();
      expect(placeholder).to.have.property('hidden', true);
      await widget.bootstrap();
      expect(placeholder).to.have.property('hidden', true);
      await widget.mount();
      expect(placeholder).to.have.property('hidden', true);
    }));
});
