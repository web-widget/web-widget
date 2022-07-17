/* global window, customElements, HTMLElement, Event, URL */
// eslint-disable-next-line max-classes-per-file
import { ApplicationService } from './applications/service.js';
import { createRegistry } from './utils/registry.js';
import { moduleLoader } from './loaders/module.js';
import { queueMicrotask } from './utils/queueMicrotask.js';
import { observe, unobserve } from './utils/visibleObserver.js';
import { WebWidgetDependencies } from './WebWidgetDependencies.js';
import * as status from './applications/status.js';

const globalLoaders = createRegistry();
let globalTimeouts = Object.create(null);

const removeElement = (element, confirm) => {
  if (confirm) {
    element.parentNode.removeChild(element);
  }
};

/**
 * @summary Web Widget Container
 * @event {Event} statechange
 */
export class HTMLWebWidgetElement extends HTMLElement {
  #application = null;

  #applicationService = null;

  #data = null;

  #isFirstConnect = false;

  #isMoveing = false;

  #timeouts = null;

  #ready = null;

  constructor() {
    super();

    let done;
    const view = this;
    const applicationService = new ApplicationService({
      loader(dependencies) {
        const { application } = view;
        view.renderRoot = null;
        view.loader = application || view.createLoader();
        return view.loader.call(this, dependencies);
      },
      getDependencies: () => {
        if (this.dependencies) {
          return this.dependencies;
        }
        const dependencies = this.createDependencies();
        this.dependencies = dependencies;
        return dependencies;
      },
      stateChangeCallback: () => {
        this.#stateChangeCallback();
        this.dispatchEvent(new Event('statechange'));
      },
      context: Object.create(null),
      timeouts: this.timeouts
    });

    /** @ignore */
    applicationService.stateChangeCallback = () => {
      this.#stateChangeCallback();
      this.dispatchEvent(new Event('statechange'));
    };

    /** @ignore */
    this.#applicationService = applicationService;

    /** @ignore */
    this.#ready = Object.assign(
      new Promise(resolve => {
        done = resolve;
      }),
      {
        change: () => {
          if (done) {
            done();
            done = null;
          }
        }
      }
    );

    this.#ready.then(() => {
      if (
        !this.inactive &&
        this.isConnected &&
        (this.import || this.src || this.application)
      ) {
        this.mount().catch(this.#throwGlobalError.bind(this));
      }
    });
  }

  /**
   * Register a local application
   * @type {function}
   * @returns {Promise}
   */
  get application() {
    return this.#application || null;
  }

  set application(value) {
    if (typeof value === 'function') {
      this.#application = value;
      if (this.loading !== 'lazy') {
        this.#ready.change();
      }
    }
  }

  /**
   * Application data
   * @attr
   * @type {(object|array)}
   */
  get data() {
    if (!this.#data) {
      const dataAttr = this.getAttribute('data');

      if (dataAttr) {
        try {
          this.#data = JSON.parse(dataAttr);
        } catch (error) {
          this.#throwGlobalError(error);
          this.#data = null;
        }
      } else if (Object.entries(this.dataset).length) {
        this.#data = { ...this.dataset };
      }
    }

    return this.#data;
  }

  set data(value) {
    if (typeof value === 'object') {
      this.#data = value;
    }
  }

  /**
   * Whether the application is inactive
   * @attr
   * @reflect
   * @type {boolean}
   */
  get inactive() {
    return this.hasAttribute('inactive');
  }

  set inactive(value) {
    if (value) {
      this.setAttribute('inactive', '');
    } else {
      this.removeAttribute('inactive');
    }
  }

  /**
   * Indicates how the browser should load the application
   * @attr
   * @reflect
   * @type {string}
   */
  get loading() {
    return this.getAttribute('loading') || 'auto';
  }

  set loading(value) {
    this.setAttribute('loading', value);
  }

  /**
   * Application module type
   * @attr
   * @reflect
   * @type {string}
   */
  get type() {
    return this.getAttribute('type') || 'module';
  }

  set type(value) {
    this.setAttribute('type', value);
  }

  /**
   * Application status
   * @readonly
   * @type {string}
   */
  get state() {
    return this.#applicationService.getState();
  }

  /**
   * Application URL
   * @attr
   * @reflect
   * @type {string}
   */
  get src() {
    const value = this.getAttribute('src');
    return value === null ? '' : new URL(value, this.baseURI).href;
  }

  set src(value) {
    this.setAttribute('src', value);
  }

  /**
   * Application bare module name
   * @attr
   * @reflect
   * @type {string}
   */
  get import() {
    const value = this.getAttribute('import');
    return value === null ? '' : value;
  }

  set import(value) {
    this.setAttribute('import', value);
  }

  get rendertarget() {
    // light || shadow
    return this.getAttribute('rendertarget') || 'shadow';
  }

  set rendertarget(value) {
    this.setAttribute('rendertarget', value);
  }

  /** @ignore */
  get timeouts() {
    if (!this.#timeouts) {
      this.#timeouts = { ...this.constructor.timeouts };
    }
    return this.#timeouts;
  }

  /** @ignore */
  set timeouts(value) {
    this.#timeouts = value;
  }

  /**
   * Create application dependent objects
   * @returns {WebWidgetDependencies}
   */
  createDependencies() {
    return new WebWidgetDependencies(this);
  }

  /**
   * Create the application's render node
   * @returns {HTMLElement}
   */
  createRenderRoot() {
    let renderRoot = null;

    if (this.rendertarget === 'shadow') {
      if (this.hasAttribute('hydrateonly')) {
        if (this.attachInternals) {
          const internals = this.attachInternals();
          renderRoot = internals.shadowRoot;
        }
      }

      if (!renderRoot) {
        renderRoot = this.attachShadow({ mode: 'closed' });
      }
    } else if (this.rendertarget === 'light') {
      renderRoot = this;
    }

    return renderRoot;
  }

  /**
   * Create application loader
   * @returns {function}
   */
  createLoader() {
    const { type } = this;
    const loader = this.constructor.loaders.get(type);

    if (!loader) {
      throw Error(`Loader is not defined: ${type}`);
    }

    return () => loader(this);
  }

  /**
   * Trigger the loading of the application
   * @returns {Promise}
   */
  async load() {
    await this.#trigger('load');
  }

  /**
   * Trigger the bootstrapping of the application
   * @returns {Promise}
   */
  async bootstrap() {
    await this.#trigger('bootstrap');
  }

  /**
   * Trigger the mounting of the application
   * @returns {Promise}
   */
  async mount() {
    await this.#trigger('mount');
  }

  /**
   * Trigger the updating of the application
   * @param   {object}   properties
   * @returns {Promise}
   */
  async update(properties = {}) {
    const dependencies = this.dependencies || {};
    Object.assign(dependencies, properties);
    await this.#trigger('update');
  }

  /**
   * Trigger the unmounting of the application
   * @returns {Promise}
   */
  async unmount() {
    await this.#trigger('unmount');
  }

  /**
   * Trigger the unloading of the application
   * @returns {Promise}
   */
  async unload() {
    const dependencies = this.dependencies || {};
    await this.#trigger('unload');
    Object.getOwnPropertyNames(dependencies).forEach(key => {
      Reflect.deleteProperty(dependencies, key);
    });
  }

  connectedCallback() {
    // connected
    if (!this.#isFirstConnect) {
      this.#firstConnectedCallback();
      this.#isFirstConnect = true;
    } else {
      if (this.#isMoveing) {
        // this.#movedCallback();
      }
    }
  }

  /** @ignore */
  #firstConnectedCallback() {
    if (this.loading === 'lazy') {
      observe(this, () => this.#ready.change());
    } else {
      this.#ready.change();
    }
  }

  disconnectedCallback() {
    this.#isMoveing = true;
    // disconnected
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.#isMoveing = false;
        this.destroyedCallback();
      }
    });
  }

  attributeChangedCallback(name) {
    if (name === 'data') {
      this.#data = null;
    }
    if (this.loading !== 'lazy') {
      this.#ready.change();
    }
  }

  destroyedCallback() {
    if (this.loading === 'lazy') {
      unobserve(this);
    }
    if (!this.inactive) {
      this.unload().catch(this.#throwGlobalError.bind(this));
    }
  }

  /** @ignore */
  #trigger(name) {
    return this.#applicationService.trigger(name, [this.dependencies]);
  }

  /** @ignore */
  #stateChangeCallback() {
    const state = this.state;
    this.setAttribute('state', state);
    if (
      [
        status.MOUNTED,
        status.LOAD_ERROR,
        status.BOOTSTRAP_ERROR,
        status.MOUNT_ERROR
      ].includes(state)
    ) {
      let placeholder, fallback;
      const isError = state !== status.MOUNTED;

      for (const element of this.children) {
        const localName = element.localName;
        if (localName === 'placeholder') {
          placeholder = element;
        } else if (localName === 'fallback') {
          fallback = element;
        }
      }

      if (placeholder && fallback) {
        removeElement(placeholder, isError);
        removeElement(fallback, !isError);
      } else if (placeholder) {
        if (!isError) {
          removeElement(placeholder, true);
        }
      } else if (fallback) {
        removeElement(fallback, !isError);
      }
    }
  }

  /** @ignore */
  #throwGlobalError(error) {
    const applicationName =
      this.name || this.import || this.src || this.localName;
    const prefix = `Web Widget application (${applicationName})`;
    if (typeof error !== 'object') {
      error = new Error(error);
    }

    if (!error.message.includes(prefix)) {
      Reflect.defineProperty(error, 'message', {
        value: `${prefix}: ${error.message}`,
        writable: true,
        configurable: true
      });
    }

    queueMicrotask(() => {
      throw error;
    });
  }

  static get observedAttributes() {
    return ['data', 'import', 'src', 'inactive'];
  }

  /** @ignore */
  static get loaders() {
    return globalLoaders;
  }

  /** @ignore */
  static get timeouts() {
    return globalTimeouts;
  }

  /**
   * Global timeout settings
   * @type {object}
   */
  static set timeouts(value) {
    globalTimeouts = value;
  }
}

Object.assign(HTMLWebWidgetElement, status);
globalLoaders.define('module', moduleLoader);
window.HTMLWebWidgetElement = HTMLWebWidgetElement;

export function bootstrap() {
  customElements.define('web-widget', HTMLWebWidgetElement);
}

if (window.WEB_WIDGET_BOOTSTRAP !== false) {
  bootstrap();
}
