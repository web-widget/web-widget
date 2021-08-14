import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from '../src/index.js';

const emptyWidget = document.createElement('web-widget');
Object.seal(emptyWidget);

const createWidget = callback => {
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
  widget.addEventListener('change', () => {
    stateStack.push(widget.state);
  });
  document.body.appendChild(widget);
  const results = { stack, stateStack, widget, properties };
  return callback ? callback(results) : results;
};

describe('The default propertys', () => {
  it('propertys', () => {
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

it('Load the UMD module', done => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.src = '/test/widgets/hello-world.umd.widget.js';
  document.body.appendChild(widget);

  widget.load().then(() => done(), done);
});

it('Load the ES module', done => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.type = 'module';
  widget.src = '/test/widgets/hello-world.esm.widget.js';
  document.body.appendChild(widget);

  widget.load().then(() => done(), done);
});

it('Load the ES module: local', done => {
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

  widget.load().then(() => done(), done);
});

it('Load the function', done => {
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

  widget.load().then(() => done(), done);
});

describe('lifecycles: load', () => {
  it('load', () =>
    createWidget(({ stack, widget }) => {
      const promise = widget.load();
      expect(widget.state).to.equal(HTMLWebWidgetElement.LOADING);
      return promise.then(() => {
        expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
        expect(stack).to.deep.equal(['load']);
      });
    }));

  it('Loading should not be repeated', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.load();
        widget.load();
        widget.load();
        await widget.load();
        expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
        expect(stack).to.deep.equal(['load']);
      })
    ));
});

describe('lifecycles: bootstrap', () => {
  it('bootstrap', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        const promise = widget.bootstrap();
        expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPING);
        await promise;
        expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load', 'bootstrap']);
      })
    ));

  it('It should load automatically before bootstraping', () =>
    createWidget(({ stack, widget }) =>
      widget.bootstrap().then(async () => {
        expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load', 'bootstrap']);
      })
    ));

  it('Mounting should not be repeated', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.bootstrap();
        widget.bootstrap();
        widget.bootstrap();
        await widget.bootstrap();
        expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load', 'bootstrap']);
      })
    ));
});

describe('lifecycles: mount', () => {
  it('mount', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.bootstrap();
        const promise = widget.mount();
        expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTING);
        await promise;
        expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
        await widget.mount();
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
      })
    ));

  it('It should bootstrap automatically before mounting', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
        expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
      })
    ));

  it('Mounting should not be repeated', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
        await widget.mount();
        widget.mount();
        widget.mount();
        await widget.mount();
        expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
      })
    ));
});

describe('lifecycles: update', () => {
  it('update', () =>
    createWidget(({ stack, widget, properties }) =>
      widget.load().then(async () => {
        const testValue = Date.now();
        await widget.bootstrap();
        await widget.mount();
        const promise = widget.update({ testValue });
        expect(widget.state).to.equal(HTMLWebWidgetElement.UPDATING);
        await promise;
        expect(properties.update).to.have.property('testValue', testValue);
        expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'update']);
      })
    ));

  it('If it is not loaded, the update should be rejected', done =>
    createWidget(({ stack, widget }) => {
      widget.update().then(
        () => {
          done(new Error('Not rejected'));
        },
        () => {
          expect(stack).to.deep.equal([]);
          done();
        }
      );
    }));

  it('If it is not bootstraped, the update should be rejected', done =>
    createWidget(({ stack, widget }) => {
      widget.load().then(async () => {
        widget.update().then(
          () => {
            done(new Error('Not rejected'));
          },
          () => {
            expect(stack).to.deep.equal(['load']);
            done();
          }
        );
      });
    }));

  it('If it is not mounted, the update should be rejected', done =>
    createWidget(({ stack, widget }) => {
      widget.load().then(async () => {
        await widget.bootstrap();
        widget.update().then(
          () => {
            done(new Error('Not rejected'));
          },
          () => {
            expect(stack).to.deep.equal(['load', 'bootstrap']);
            done();
          }
        );
      });
    }));

  it('Continuous updates should be allowed', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
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
      })
    ));
});

describe('lifecycles: unmount', () => {
  it('unmount', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.bootstrap();
        await widget.mount();
        const promise = widget.unmount();
        expect(widget.state).to.equal(HTMLWebWidgetElement.UNMOUNTING);
        await promise;
        expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'unmount']);
      })
    ));

  it('If it is not loaded, it should not be unmount', () =>
    createWidget(({ stack, widget }) =>
      widget.unmount().then(() => {
        expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
        expect(stack).to.deep.equal([]);
      })
    ));

  it('If it is not bootstraped, it should not be unmount', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.unmount();
        expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
        expect(stack).to.deep.equal(['load']);
      })
    ));

  it('If it is not mounted, it should not be unmount', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.bootstrap();
        await widget.unmount();
        expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load', 'bootstrap']);
      })
    ));

  it('Unmounting should not be repeated', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
        await widget.unmount();
        widget.unmount();
        widget.unmount();
        await widget.unmount();
        expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'unmount']);
      })
    ));
});

describe('lifecycles: unload', () => {
  it('unload', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
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
      })
    ));

  it('Updated data should be cleaned up', () =>
    createWidget(({ widget, properties }) =>
      widget.mount().then(async () => {
        const testValue = Date.now();
        await widget.update({ testValue });
        expect(properties.update).to.have.property('testValue', testValue);
        await widget.unmount();
        expect(properties.unmount).to.have.property('testValue', testValue);
        await widget.unload();
        expect(properties.unmount).to.not.have.property('testValue');
      })
    ));

  it('If it is not loaded, it should not be unload', () =>
    createWidget(({ stack, widget }) =>
      widget.unload().then(() => {
        expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
        expect(stack).to.deep.equal([]);
      })
    ));

  it('If it is not bootstraped, it should not be unload', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.unload();
        expect(widget.state).to.equal(HTMLWebWidgetElement.LOADED);
        expect(stack).to.deep.equal(['load']);
      })
    ));

  it('If it has been bootstraped, it should be allowed to unload', () =>
    createWidget(({ stack, widget }) =>
      widget.bootstrap().then(async () => {
        await widget.unload();
        expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'unload']);
      })
    ));

  it('If it has been mounted, it should be unmount before being unload', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
        await widget.unload();
        expect(widget.state).to.equal(HTMLWebWidgetElement.INITIAL);
        expect(stack).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload'
        ]);
      })
    ));

  it('Unloading should not be repeated', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
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
      })
    ));

  it('After unloading, the load should be allowed to continue', () =>
    createWidget(({ stateStack, stack, widget }) =>
      widget.mount().then(async () => {
        let promise;
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
      })
    ));
});

describe('Events', () => {
  it('change', () =>
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
