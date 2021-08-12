import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from '../src/index.js';

const emptyWidget = document.createElement('web-widget');
Object.seal(emptyWidget);

const createWidget = callback => {
  const stack = [];
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.application = () => {
    stack.push('load');
    return {
      async bootstrap() {
        stack.push('bootstrap');
      },

      async mount() {
        stack.push('mount');
      },

      async update() {
        stack.push('update');
      },

      async unmount() {
        stack.push('unmount');
      },

      async unload() {
        stack.push('unload');
      }
    };
  };
  document.body.appendChild(widget);
  return callback ? callback({ stack, widget }) : { stack, widget };
};

describe('The default propertys', () => {
  it('propertys', () => {
    expect(emptyWidget).to.have.property('application', null);
    expect(emptyWidget).to.have.property('inactive', false);
    expect(emptyWidget).to.have.property('importance', 'auto');
    expect(emptyWidget).to.have.property('loading', 'auto');
    expect(emptyWidget).to.have.property('sandboxed', false);
    expect(emptyWidget).to.have.property('type', '');
    expect(emptyWidget).to.have.property(
      'status',
      HTMLWebWidgetElement.NOT_LOADED
    );
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
      expect(widget.status).to.equal(HTMLWebWidgetElement.LOADING_SOURCE_CODE);
      return promise.then(() => {
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_BOOTSTRAPPED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load']);
      })
    ));
});

describe('lifecycles: bootstrap', () => {
  it('bootstrap', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        const promise = widget.bootstrap();
        expect(widget.status).to.equal(HTMLWebWidgetElement.BOOTSTRAPPING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap']);
      })
    ));

  it('It should load automatically before bootstraping', () =>
    createWidget(({ stack, widget }) =>
      widget.bootstrap().then(async () => {
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTED);
        await widget.mount();
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
      })
    ));

  it('It should bootstrap automatically before mounting', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
      })
    ));
});

describe('lifecycles: update', () => {
  it('update', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.bootstrap();
        await widget.mount();
        const promise = widget.update({ a: 0 });
        expect(widget.status).to.equal(HTMLWebWidgetElement.UPDATING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.UNMOUNTING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'unmount']);
      })
    ));

  it('If it is not loaded, it should not be unmount', () =>
    createWidget(({ stack, widget }) =>
      widget.unmount().then(() => {
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_LOADED);
        expect(stack).to.deep.equal([]);
      })
    ));

  it('If it is not bootstraped, it should not be unmount', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.unmount();
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load']);
      })
    ));

  it('If it is not mounted, it should not be unmount', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.bootstrap();
        await widget.unmount();
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.UNLOADING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_LOADED);
        expect(stack).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload'
        ]);
      })
    ));

  it('If it is not loaded, it should not be unload', () =>
    createWidget(({ stack, widget }) =>
      widget.unload().then(() => {
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_LOADED);
        expect(stack).to.deep.equal([]);
      })
    ));

  it('If it is not bootstraped, it should not be unload', () =>
    createWidget(({ stack, widget }) =>
      widget.load().then(async () => {
        await widget.unload();
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load']);
      })
    ));

  it('If it has been bootstraped, it should be allowed to unload', () =>
    createWidget(({ stack, widget }) =>
      widget.bootstrap().then(async () => {
        await widget.unload();
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_LOADED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'unload']);
      })
    ));

  it('If it has been mounted, it should be unmount before being unload', () =>
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
        await widget.unload();
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_LOADED);
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
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_LOADED);
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
    createWidget(({ stack, widget }) =>
      widget.mount().then(async () => {
        await widget.unload();
        stack.length = 0;
        let promise = widget.load();

        expect(widget.status).to.equal(
          HTMLWebWidgetElement.LOADING_SOURCE_CODE
        );
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_BOOTSTRAPPED);
        expect(stack).to.deep.equal(['load']);

        promise = widget.bootstrap();
        expect(widget.status).to.equal(HTMLWebWidgetElement.BOOTSTRAPPING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap']);

        promise = widget.mount();
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);

        promise = widget.update();
        expect(widget.status).to.equal(HTMLWebWidgetElement.UPDATING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.MOUNTED);
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'update']);

        promise = widget.unmount();
        expect(widget.status).to.equal(HTMLWebWidgetElement.UNMOUNTING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_MOUNTED);
        expect(stack).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'unmount'
        ]);

        promise = widget.unload();
        expect(widget.status).to.equal(HTMLWebWidgetElement.UNLOADING);
        await promise;
        expect(widget.status).to.equal(HTMLWebWidgetElement.NOT_LOADED);
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
