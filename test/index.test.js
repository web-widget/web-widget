import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from '../src/index.js';

const emptyWidget = document.createElement('web-widget');
Object.seal(emptyWidget);

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
  widget.src = '/test/widget/hello-world.umd.widget.js';
  document.body.appendChild(widget);

  widget.load().then(() => done(), done);
});

it('Load the ES module', done => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.type = 'module';
  widget.src = '/test/widget/hello-world.esm.widget.js';
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

describe('lifecycles', () => {
  const createWidget = () => {
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
    return { stack, widget };
  };

  it('load', done => {
    const { stack, widget } = createWidget();

    widget.load().then(() => {
      expect(stack).to.deep.equal(['load']);
      done();
    }, done);
  });

  it('bootstrap', done => {
    const { stack, widget } = createWidget();

    widget.bootstrap().then(() => {
      expect(stack).to.deep.equal(['load', 'bootstrap']);
      done();
    }, done);
  });

  it('mount', done => {
    const { stack, widget } = createWidget();

    widget.mount().then(() => {
      expect(stack).to.deep.equal(['load', 'bootstrap', 'mount']);
      done();
    }, done);
  });

  it('update', done => {
    const { stack, widget } = createWidget();

    widget
      .mount()
      .then(() => widget.update())
      .then(() => {
        expect(stack).to.deep.equal(['load', 'bootstrap', 'mount', 'update']);
        done();
      }, done);
  });

  it('update: Should be executed after mount', done => {
    const { widget } = createWidget();

    widget.update().then(
      () => {
        done(new Error(widget.status));
      },
      () => {
        done();
      }
    );
  });

  it('unmount: Should be executed after mount', done => {
    const { widget } = createWidget();

    widget.unmount().then(
      () => {
        done(new Error(widget.status));
      },
      () => {
        done();
      }
    );
  });

  it('unload', done => {
    const { widget } = createWidget();

    widget
      .mount()
      .then(() => widget.unload())
      .then(() => done(), done);
  });

  it('unload: Should be executed after mount', done => {
    const { widget } = createWidget();

    widget.unload().then(
      () => {
        done(new Error(widget.status));
      },
      () => {
        done();
      }
    );
  });
});
