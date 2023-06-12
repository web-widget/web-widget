import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from '../src/index.js';

const shadowRoot = Symbol('shadowRoot');
const oldAttachShadow = HTMLElement.prototype.attachShadow;
HTMLElement.prototype.attachShadow = function attachShadow() {
  this[shadowRoot] = oldAttachShadow.apply(this, arguments);
  return this[shadowRoot];
};

const emptyWidget = document.createElement('web-widget');
Object.freeze(emptyWidget);

const createWidget = callback => {
  const lifecycleHistory = [];
  const stateHistory = [];
  let properties = null;
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.application = () => {
    lifecycleHistory.push('load');
    return {
      async bootstrap(dependencies) {
        properties = dependencies;
        lifecycleHistory.push('bootstrap');
      },

      async mount(dependencies) {
        properties = dependencies;
        lifecycleHistory.push('mount');
      },

      async update(dependencies) {
        properties = dependencies;
        lifecycleHistory.push('update');
      },

      async unmount(dependencies) {
        properties = dependencies;
        lifecycleHistory.push('unmount');
      },

      async unload(dependencies) {
        properties = dependencies;
        lifecycleHistory.push('unload');
      }
    };
  };
  widget.addEventListener('statechange', () => {
    stateHistory.push(widget.state);
  });
  document.body.appendChild(widget);
  return callback({
    getStateHistory() {
      return stateHistory;
    },
    widget,
    getProperties() {
      return properties;
    }
  });
};

describe('Element default properties', () => {
  it('properties', () => {
    expect(emptyWidget).to.have.property('application', null);
    expect(emptyWidget).to.have.property('import', '');
    expect(emptyWidget).to.have.property('inactive', false);
    expect(emptyWidget).to.have.property('loading', 'auto');
    expect(emptyWidget).to.have.property('src', '');
    expect(emptyWidget).to.have.property('state', HTMLWebWidgetElement.INITIAL);
    expect(emptyWidget).to.have.property('type', 'module');
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
    expect(emptyWidget).to.have.property('createProperties').is.a('function');
    expect(emptyWidget).to.have.property('createApplication').is.a('function');
    expect(emptyWidget).to.have.property('createContainer').is.a('function');
  });
});

describe('Load module', () => {
  it('Load the ES module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.type = 'module';
    widget.src = '/test/widgets/hello-world.esm.widget.js';
    document.body.appendChild(widget);

    return widget.load().then(() => {
      if (window.TEST_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });

  it('Load the ES module (single instance)', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.type = 'module';
    widget.src = '/test/widgets/hello-world.single-instance.esm.widget.js';
    document.body.appendChild(widget);

    return widget.load().then(() => {
      if (window.TEST_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
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

describe('Load module: error', () => {
  it('Load module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.src = '/test/widgets/404';
    document.body.appendChild(widget);

    return widget.load().then(
      () => Promise.reject(new Error('Not rejected')),
      () => Promise.resolve()
    );
  });

  it('Autoload failure should trigger a global error', () => {
    const globalError = new Promise((resolve, reject) => {
      window.onerror = error => {
        reject(error);
      };
    });

    const widget = document.createElement('web-widget');
    widget.src = '/test/widgets2/404';
    document.body.appendChild(widget);

    return globalError.then(
      () => Promise.reject(new Error('Not rejected')),
      () => Promise.resolve()
    );
  });
});

describe('Auto load', () => {
  const src = '/test/widgets/hello-world.esm.widget.js';
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

describe('Application property: parameters', () => {
  it('parameters', () =>
    createWidget(async ({ widget, getProperties }) => {
      const value = String(Date.now());
      widget.setAttribute('test', value);
      await widget.mount();
      expect(getProperties().parameters).to.have.property('test', value);
      await widget.unload();
      expect(getProperties().parameters).to.have.property('test', value);
    }));
});

describe('Application property: container', () => {
  it('container', () =>
    createWidget(async ({ widget, getProperties }) => {
      await widget.mount();
      expect(getProperties().container).to.be.an.instanceof(ShadowRoot);
      await widget.unload();
      expect(getProperties().container).to.be.an.instanceof(ShadowRoot);
    }));

  it('context', () =>
    createWidget(async ({ widget, getProperties }) => {
      await widget.mount();
      await getProperties().container.unmount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.BOOTSTRAPPED);
      await getProperties().container.mount();
      expect(widget.state).to.equal(HTMLWebWidgetElement.MOUNTED);
    }));
});

describe('Application property: data', () => {
  it('data', () =>
    createWidget(async ({ widget, getProperties }) => {
      const testValue = Date.now();
      widget.data = { testValue };
      await widget.mount();
      expect(getProperties().data).to.have.property('testValue', testValue);
      await widget.unload();
      expect(getProperties().data).to.have.property('testValue', testValue);
    }));

  it('Should support "data" attribute to store JSON content', () =>
    createWidget(async ({ widget, getProperties }) => {
      const data = {
        test: Date.now()
      };
      widget.setAttribute('data', JSON.stringify(data));
      await widget.mount();
      expect(getProperties().data).to.deep.equal(data);
      await widget.unload();
      expect(getProperties().data).to.deep.equal(data);
    }));

  it('The priority of attributes and properties should be handled correctly', () =>
    createWidget(async ({ widget, getProperties }) => {
      const arrtData = {
        test: Date.now()
      };
      const priorityData = {
        test: 'priority'
      };

      widget.data = priorityData;
      widget.setAttribute('data', JSON.stringify(arrtData));
      await widget.mount();
      expect(getProperties().data).to.deep.equal(arrtData);

      widget.setAttribute('data', JSON.stringify(arrtData));
      widget.data = priorityData;
      await widget.unmount();
      await widget.mount();
      // expect(getProperties().data).to.deep.equal(priorityData); // v1.0.0-beta.1: widget.data 不会再更新
    }));

  it('The content of the "data-*" attribute should be used as the default value', () =>
    createWidget(async ({ widget, getProperties }) => {
      const a = String(Date.now());
      const b = String(Date.now());
      widget.dataset.a = a;
      widget.setAttribute('data-b', b);
      await widget.mount();
      expect(getProperties().data).to.have.property('a', a);
      expect(getProperties().data).to.have.property('b', b);
      await widget.unload();
      expect(getProperties().data).to.have.property('a', a);
      expect(getProperties().data).to.have.property('b', b);
    }));
});

describe('Events', () => {
  it('statechange', () =>
    createWidget(async ({ getStateHistory, widget }) => {
      await widget.load();
      await widget.bootstrap();
      await widget.mount();
      await widget.update();
      await widget.unmount();
      await widget.unload();
      expect(getStateHistory()).to.deep.equal([
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

describe('Placeholder element', () => {
  it('placeholder', () =>
    createWidget(async ({ widget }) => {
      const placeholder = document.createElement('placeholder');
      widget.appendChild(placeholder);
      await widget.load();
      expect(placeholder).to.have.property('isConnected', true);
      await widget.bootstrap();
      expect(placeholder).to.have.property('isConnected', true);
      await widget.mount();
      expect(placeholder).to.have.property('isConnected', false);
    }));

  it('The placeholder element must be a direct descendant', () =>
    createWidget(async ({ widget }) => {
      const child = document.createElement('div');
      const childPlaceholder = document.createElement('placeholder');
      const placeholder = document.createElement('placeholder');
      child.appendChild(childPlaceholder);
      widget.appendChild(child);
      widget.appendChild(placeholder);
      await widget.load();
      expect(childPlaceholder).to.have.property('isConnected', true);
      expect(placeholder).to.have.property('isConnected', true);
      await widget.bootstrap();
      expect(childPlaceholder).to.have.property('isConnected', true);
      expect(placeholder).to.have.property('isConnected', true);
      await widget.mount();
      expect(childPlaceholder).to.have.property('isConnected', true);
      expect(placeholder).to.have.property('isConnected', false);
    }));

  it('Change visibility only once', () =>
    createWidget(async ({ widget }) => {
      const placeholder = document.createElement('placeholder');
      widget.appendChild(placeholder);
      await widget.load();
      expect(placeholder).to.have.property('isConnected', true);
      await widget.bootstrap();
      expect(placeholder).to.have.property('isConnected', true);
      await widget.mount();
      expect(placeholder).to.have.property('isConnected', false);
      await widget.update();
      expect(placeholder).to.have.property('isConnected', false);
      await widget.unmount();
      expect(placeholder).to.have.property('isConnected', false);
      await widget.unload();
      expect(placeholder).to.have.property('isConnected', false);
      await widget.load();
      expect(placeholder).to.have.property('isConnected', false);
      await widget.bootstrap();
      expect(placeholder).to.have.property('isConnected', false);
      await widget.mount();
      expect(placeholder).to.have.property('isConnected', false);
    }));
});
