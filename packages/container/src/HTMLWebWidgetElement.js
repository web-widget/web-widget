/* global window, document, customElements, HTMLElement, Event, Node, IntersectionObserver, URL, MutationObserver, setTimeout, clearTimeout */
// eslint-disable-next-line max-classes-per-file
import { ApplicationService } from './applications/service.js';
import { createRegistry } from './utils/registry.js';
import { getParentNode } from './utils/nodes.js';
import { moduleLoader } from './loaders/module.js';
import { queueMicrotask } from './utils/queueMicrotask.js';
import { WebWidgetDependencies } from './WebWidgetDependencies.js';
import { WebWidgetSandbox } from './WebWidgetSandbox.js';
import * as status from './applications/status.js';

const APPLICATION = Symbol('application');
const DATA = Symbol('data');
const FIRST_CONNECTED = Symbol('firstConnect');
const APPLICATION_SERVICE = Symbol('applicationService');
const MOVEING = Symbol('moveing');
const PARENT_WIDGET = Symbol('parentWidget');
const STATECHANGE_CALLBACK = Symbol('statechangeCallback');
const THROW_GLOBAL_ERROR = Symbol('throwGlobalError');
const TIMEOUTS = Symbol('timeouts');
const TRIGGER = Symbol('trigger');
const TRY_AUTO_LOAD = Symbol('tryAutoLoad');
const TRY_AUTO_LOAD_TIMER = Symbol('tryAutoLoadTimer');
const TRY_AUTO_UNLOAD = Symbol('tryAutoUnload');
const TRY_AUTO_UNLOAD_TIMER = Symbol('tryAutoUnloadTimer');

const globalPortalDestinations = createRegistry();
const globalLoaders = createRegistry();
let globalTimeouts = Object.create(null);

const isBindingElementLifecycle = view => !view.inactive;
const isResourceReady = view =>
  view.isConnected &&
  (view.import || view.src || view.application || view.text);
const isAutoLoad = view =>
  isBindingElementLifecycle(view) && isResourceReady(view);
const isAutoUnload = isBindingElementLifecycle;

const lazyObserver = new IntersectionObserver(
  entries => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting && isAutoLoad(target)) {
        target[TRY_AUTO_LOAD]();
        lazyObserver.unobserve(target);
      }
    });
  },
  {
    rootMargin: '80%'
  }
);

function addLazyLoad(view) {
  lazyObserver.observe(view);
}

function removeLazyLoad(view) {
  lazyObserver.unobserve(view);
}

function watchWebWidgetAlias(context, callback) {
  const name = 'web-widget';
  callback(
    [...context.querySelectorAll(`[is=${name}]`)].filter(element =>
      element.localName.includes('-')
    )
  );
  new MutationObserver(mutationsList => {
    callback(
      mutationsList
        .reduce((accumulator, { type, target, addedNodes }) => {
          if (type === 'attributes') {
            accumulator.push(target);
          } else {
            accumulator.push(...addedNodes);
          }
          return accumulator;
        }, [])
        .filter(
          node =>
            node.nodeType === Node.ELEMENT_NODE &&
            node.localName.includes('-') &&
            node.getAttribute('is') === name
        )
    );
  }).observe(context, {
    attributeFilter: ['is'],
    attributes: true,
    childList: true,
    subtree: true
  });
}

function updateElement(context) {
  watchWebWidgetAlias(context, elements => {
    elements.forEach(target => {
      const alias = target.localName;
      if (!customElements.get(alias)) {
        // ignore analyze
        const define = 'define';
        // eslint-disable-next-line no-use-before-define
        customElements[define](alias, class extends HTMLWebWidgetElement {});
      }
    });
  });
}

/**
 * @summary Web Widget Container
 * @event {Event} statechange
 */
export class HTMLWebWidgetElement extends HTMLElement {
  constructor() {
    super();

    const view = this;
    const applicationService = new ApplicationService(
      function (dependencies) {
        if (!isResourceReady(view)) {
          throw new Error(`Cannot load: Not initialized`);
        }

        const { application } = view;
        view.sandbox =
          view.sandbox || view.sandboxed ? view.createSandbox() : null;
        view.renderRoot = null;
        view.loader = application || view.createLoader();
        view.portals = [];

        if (view.sandboxed && !view.sandbox.window) {
          throw new Error(`Sandbox mode is not implemented`);
        }

        return view.loader.call(this, dependencies);
      },
      () => {
        const dependencies = this.createDependencies();
        this.dependencies = dependencies;
        return dependencies;
      },
      this.timeouts
    );

    /** @ignore */
    applicationService.stateChangeCallback = () => {
      this[STATECHANGE_CALLBACK]();
      this.dispatchEvent(new Event('statechange'));
    };

    /** @ignore */
    this[APPLICATION_SERVICE] = applicationService;
  }

  /**
   * Register a local application
   * @type {function}
   * @returns {Promise}
   */
  get application() {
    return this[APPLICATION] || null;
  }

  set application(value) {
    if (typeof value === 'function') {
      this[APPLICATION] = value;
      this[TRY_AUTO_LOAD]();
    }
  }

  /**
   * Application content security policy
   * @attr
   * @reflect
   * @type {string}
   */
  get csp() {
    return this.getAttribute('csp') || '';
  }

  set csp(value) {
    this.setAttribute('csp', value);
  }

  /**
   * Application data
   * @attr
   * @type {(object|array)}
   */
  get data() {
    if (!this[DATA]) {
      const dataAttr = this.getAttribute('data');

      if (dataAttr) {
        try {
          this[DATA] = JSON.parse(dataAttr);
        } catch (error) {
          this[THROW_GLOBAL_ERROR](error);
          this[DATA] = {};
        }
      } else {
        this[DATA] = { ...this.dataset };
      }
    }

    return this[DATA];
  }

  set data(value) {
    if (typeof value === 'object') {
      this[DATA] = value;
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
    return this[APPLICATION_SERVICE].getState();
  }

  /**
   * Whether to enable sandbox mode
   * @attr
   * @reflect
   * @type {boolean}
   */
  get sandboxed() {
    return this.hasAttribute('sandboxed');
  }

  set sandboxed(value) {
    if (value) {
      this.setAttribute('sandboxed', '');
    } else {
      this.removeAttribute('sandboxed');
    }
  }

  /**
   * Application name
   * @attr
   * @reflect
   * @type {string}
   */
  get name() {
    return this.getAttribute('name') || '';
  }

  set name(value) {
    this.setAttribute('name', value);
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

  /**
   * Application source code
   * @attr
   * @reflect
   * @type {string}
   */
  get text() {
    return this.getAttribute('text') || '';
  }

  set text(value) {
    this.setAttribute('text', value);
  }

  /** @ignore */
  get timeouts() {
    if (!this[TIMEOUTS]) {
      this[TIMEOUTS] = { ...this.constructor.timeouts };
    }
    return this[TIMEOUTS];
  }

  /** @ignore */
  set timeouts(value) {
    this[TIMEOUTS] = value;
  }

  /**
   * Create application dependent objects
   * @returns {WebWidgetDependencies}
   */
  createDependencies() {
    return new WebWidgetDependencies(this);
  }

  /** @ignore */
  createSandbox() {
    return new WebWidgetSandbox(this);
  }

  /**
   * Create the application's render node
   * @returns {HTMLElement}
   */
  createRenderRoot() {
    let renderRoot = null;
    const { sandboxed, sandbox } = this;

    if (sandboxed) {
      const sandboxDoc = sandbox.window.document;
      const style = sandboxDoc.createElement('style');
      style.textContent = `body{margin:0}`;
      sandboxDoc.head.appendChild(style);
      renderRoot = sandboxDoc.body;
    } else if (this.rendertarget === 'shadow') {
      if (this.hasAttribute('hydrateonly')) {
        if (this.attachInternals) {
          const internals = this.attachInternals();
          renderRoot = internals.shadowRoot;
        }
      }

      if (!renderRoot) {
        renderRoot = this.attachShadow({ mode: 'closed' });
      }

      updateElement(renderRoot);
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
    await this[TRIGGER]('load');
  }

  /**
   * Trigger the bootstrapping of the application
   * @returns {Promise}
   */
  async bootstrap() {
    await this[TRIGGER]('bootstrap');
  }

  /**
   * Trigger the mounting of the application
   * @returns {Promise}
   */
  async mount() {
    await this[TRIGGER]('mount');
  }

  /**
   * Trigger the updating of the application
   * @param   {object}   properties
   * @returns {Promise}
   */
  async update(properties = {}) {
    const dependencies = this.dependencies || {};
    Object.assign(dependencies, properties);
    await this[TRIGGER]('update');
  }

  /**
   * Trigger the unmounting of the application
   * @returns {Promise}
   */
  async unmount() {
    const portals = this.portals || [];
    await this[TRIGGER]('unmount');
    await Promise.all(portals.map(widget => widget.unmount()));
  }

  /**
   * Trigger the unloading of the application
   * @returns {Promise}
   */
  async unload() {
    const portals = this.portals || [];
    const dependencies = this.dependencies || {};
    await this[TRIGGER]('unload');
    await Promise.all(portals.map(widget => widget.unload()));
    Object.getOwnPropertyNames(dependencies).forEach(key => {
      Reflect.deleteProperty(dependencies, key);
    });
  }

  connectedCallback() {
    // connected
    if (!this[FIRST_CONNECTED]) {
      this.firstConnectedCallback();
      this[FIRST_CONNECTED] = true;
    } else {
      if (this[MOVEING]) {
        // this.movedCallback();
      }
    }
  }

  firstConnectedCallback() {
    if (this[PARENT_WIDGET]()) {
      const { sandboxed, csp } = this[PARENT_WIDGET]();
      if (sandboxed) {
        this.sandboxed = sandboxed;
      }
      if (csp) {
        this.csp = csp;
      }
    }

    if (this.loading === 'lazy') {
      addLazyLoad(this);
    } else {
      this[TRY_AUTO_LOAD]();
    }
  }

  disconnectedCallback() {
    this[MOVEING] = true;
    // disconnected
    queueMicrotask(() => {
      if (!this.isConnected) {
        this[MOVEING] = false;
        this.destroyedCallback();
      }
    });
  }

  attributeChangedCallback(name) {
    if (name === 'data') {
      delete this[DATA];
    } else if (this.loading !== 'lazy') {
      this[TRY_AUTO_LOAD]();
    }
  }

  destroyedCallback() {
    if (this.loading === 'lazy') {
      removeLazyLoad(this);
    }
    this[TRY_AUTO_UNLOAD]();
  }

  /** @ignore */
  [TRY_AUTO_LOAD]() {
    this[TRY_AUTO_LOAD_TIMER] = setTimeout(() => {
      if (isAutoLoad(this)) {
        this.mount().catch(this[THROW_GLOBAL_ERROR].bind(this));
      }
      clearTimeout(this[TRY_AUTO_LOAD_TIMER]);
    });
  }

  /** @ignore */
  [TRY_AUTO_UNLOAD]() {
    this[TRY_AUTO_UNLOAD_TIMER] = setTimeout(() => {
      if (isAutoUnload(this)) {
        this.unload().catch(this[THROW_GLOBAL_ERROR].bind(this));
        if (this.sandboxed) {
          this.sandbox.unload();
        }
      }
      clearTimeout(this[TRY_AUTO_UNLOAD_TIMER]);
    });
  }

  /** @ignore */
  [TRIGGER](name) {
    return this[APPLICATION_SERVICE].trigger(name, [this.dependencies]);
  }

  /** @ignore */
  [STATECHANGE_CALLBACK]() {
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
        placeholder.hidden = isError;
        fallback.hidden = !isError;
      } else if (placeholder) {
        if (!isError) {
          placeholder.hidden = true;
        }
      } else if (fallback) {
        fallback.hidden = !isError;
      }
    }
  }

  /** @ignore */
  [PARENT_WIDGET]() {
    const parentWidgetElement = getParentNode(this, this.constructor);
    if (parentWidgetElement) {
      return parentWidgetElement;
    }
    return null;
  }

  /** @ignore */
  [THROW_GLOBAL_ERROR](error) {
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
    return ['data', 'import', 'src', 'text', 'inactive'];
  }

  /**
   * Destination registration
   * @type {object}
   */
  static get portalDestinations() {
    return globalPortalDestinations;
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
  updateElement(document);
}

if (window.WEB_WIDGET_BOOTSTRAP !== false) {
  bootstrap();
}
