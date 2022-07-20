/* global window, customElements, HTMLElement, Event, URL, HTMLScriptElement */
// eslint-disable-next-line max-classes-per-file
import { ApplicationService } from './applications/service.js';
import { queueMicrotask } from './utils/queueMicrotask.js';
import { observe, unobserve } from './utils/visibleObserver.js';
import * as status from './applications/status.js';
import { WebWidgetUpdateEvent } from './WebWidgetUpdateEvent.js';

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

  #customProperties = {};

  #isFirstConnect = false;

  #isMoveing = false;

  #timeouts = null;

  constructor() {
    super();

    const view = this;

    /** @ignore */
    this.#applicationService = new ApplicationService({
      getProperties: () => {
        if (!this.properties) {
          this.properties = this.createProperties();
        }
        return this.properties;
      },
      getApplication(properties) {
        if (!view.application) {
          view.application = view.createApplication();
        }

        return view.application.call(this, properties);
      },
      timeouts: this.timeouts
    });

    this.#applicationService.stateChangeCallback = () => {
      this.#stateChangeCallback();
      this.dispatchEvent(new Event('statechange'));
    };
  }

  /** @ignore */
  #autoMount() {
    if (
      this.state === status.INITIAL &&
      !this.inactive &&
      this.isConnected &&
      (this.import || this.src || this.application)
    ) {
      this.mount().catch(this.#throwGlobalError.bind(this));
    }
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
        this.#autoMount();
      }
    }
  }

  /**
   * Application properties
   * @type {object}
   */
  get customProperties() {
    return this.#customProperties;
  }

  set customProperties(value) {
    if (typeof value === 'object') {
      this.#customProperties = value;
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
   * Hook: Create the application's properties
   */
  createProperties() {
    let container, data, parameters;
    const view = this;
    const customProperties = this.customProperties;
    return Object.assign(
      Object.create({
        get container() {
          if (!container) {
            container = view.createContainer();
          }
          return container;
        },

        get data() {
          if (!data) {
            data = view.createData();
          }
          return data;
        },

        set data(value) {
          data = value;
        },

        get parameters() {
          if (!parameters) {
            parameters = view.createParameters();
          }
          return parameters;
        }
      }),
      customProperties
    );
  }

  /**
   * Hook: Create the application's render node
   * @returns {HTMLElement}
   */
  createContainer() {
    let container = null;

    if (this.rendertarget === 'shadow') {
      if (this.hasAttribute('hydrateonly')) {
        if (this.attachInternals) {
          const internals = this.attachInternals();
          container = internals.shadowRoot;
        }
      }

      if (!container) {
        container = this.attachShadow({ mode: 'open' });
      }
    } else if (this.rendertarget === 'light') {
      container = this;
    }

    if (container) {
      ['mount', 'update', 'unmount'].forEach(name => {
        if (!container[name]) {
          Reflect.defineProperty(container, name, {
            value: properties => this[name](properties)
          });
        }
      });
    }

    return container;
  }

  /**
   * Hook: Create the application's data
   * @returns {(object|array|null)}
   */
  createData() {
    return this.data;
  }

  /**
   * Hook: Create the application's parameters
   * @returns {(object}
   */
  createParameters() {
    return [...this.attributes].reduce((accumulator, { name, value }) => {
      accumulator[name] = value;
      return accumulator;
    }, Object.create(null));
  }

  /**
   * Hook: Create Create the application's loader
   * @returns {function}
   */
  createApplication() {
    const { type } = this;

    if (type !== 'module') {
      throw Error(`The module type is not supported: ${type}`);
    }

    // @see https://github.com/WICG/import-maps#feature-detection
    const supportsImportMaps =
      HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');

    function getModuleValue(module) {
      return module.default || module;
    }

    function importModule(target) {
      if (!supportsImportMaps && typeof importShim === 'function') {
        // @see https://github.com/guybedford/es-module-shims
        // eslint-disable-next-line no-undef
        return importShim(target);
      }
      return import(/* @vite-ignore */ /* webpackIgnore: true */ target);
    }

    const nameOrPath = this.import || this.src;
    return () => importModule(nameOrPath).then(getModuleValue);
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
    if (
      this.properties &&
      this.dispatchEvent(
        new WebWidgetUpdateEvent('update', {
          value: properties,
          cancelable: true
        })
      )
    ) {
      Object.assign(this.properties, properties);
      await this.#trigger('update');
    } else {
      throw new Error(`Can't update`);
    }
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
    const properties = this.properties || {};
    await this.#trigger('unload');
    Object.getOwnPropertyNames(properties).forEach(key => {
      Reflect.deleteProperty(properties, key);
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
      observe(this, () => this.#autoMount());
    } else {
      this.#autoMount();
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
      this.#autoMount();
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
    return this.#applicationService.trigger(name);
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
window.HTMLWebWidgetElement = HTMLWebWidgetElement;

customElements.define('web-widget', HTMLWebWidgetElement);
