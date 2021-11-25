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
const LOCAL_NAME = 'web-widget';
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

function updateElement(target) {
  const newTagName = target.localName;
  if (newTagName.includes('-') && !customElements.get(newTagName)) {
    // eslint-disable-next-line no-use-before-define
    customElements.define(newTagName, class extends HTMLWebWidgetElement {});
  }
}

function autoUpdateElement(documentOrShadowRoot) {
  const tryUpdateElement = node =>
    node.nodeType === Node.ELEMENT_NODE &&
    node.getAttribute('is') === LOCAL_NAME &&
    updateElement(node);
  return new MutationObserver(mutationsList => {
    mutationsList.forEach(({ type, target, addedNodes }) => {
      if (type === 'attributes') {
        tryUpdateElement(target);
      } else {
        addedNodes.forEach(node => tryUpdateElement(node));
      }
    });
  }).observe(documentOrShadowRoot, {
    attributeFilter: ['is'],
    attributes: true,
    childList: true,
    subtree: true
  });
}

function addLazyLoad(view) {
  lazyObserver.observe(view);
}

function removeLazyLoad(view) {
  lazyObserver.unobserve(view);
}

export class HTMLWebWidgetElement extends HTMLElement {
  constructor() {
    super();

    const applicationService = new ApplicationService(
      dependencies => {
        if (!isResourceReady(this)) {
          throw new Error(`Cannot load: Not initialized`);
        }

        const { application } = this;
        this.sandbox =
          this.sandbox || this.sandboxed ? this.createSandbox() : null;
        this.renderRoot = null;
        this.loader = application
          ? async p => application(p)
          : this.createLoader.bind(this);
        this.portals = [];

        if (this.sandboxed && !this.sandbox.window) {
          throw new Error(`Sandbox mode is not implemented`);
        }

        return this.loader(dependencies);
      },
      () => {
        const dependencies = this.createDependencies();
        this.dependencies = dependencies;
        return dependencies;
      },
      this.timeouts
    );

    applicationService.stateChangeCallback = () => {
      this[STATECHANGE_CALLBACK]();
      this.dispatchEvent(new Event('statechange'));
    };

    this[APPLICATION_SERVICE] = applicationService;
  }

  get application() {
    return this[APPLICATION] || null;
  }

  set application(value) {
    if (typeof value === 'function') {
      this[APPLICATION] = value;
      this[TRY_AUTO_LOAD]();
    }
  }

  get csp() {
    return this.getAttribute('csp') || '';
  }

  set csp(value) {
    this.setAttribute('csp', value);
  }

  get data() {
    if (this[DATA] !== undefined) {
      return this[DATA];
    }

    const dataAttr = this.getAttribute('data');

    if (dataAttr) {
      try {
        this[DATA] = JSON.parse(dataAttr);
        return this[DATA];
      } catch (error) {
        this[THROW_GLOBAL_ERROR](error);
      }
    }

    return this.dataset;
  }

  set data(value) {
    if (typeof value === 'object') {
      this[DATA] = value;
    }
  }

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

  get importance() {
    return this.getAttribute('importance') || 'auto';
  }

  set importance(value) {
    this.setAttribute('importance', value);
  }

  get loading() {
    return this.getAttribute('loading') || 'auto';
  }

  set loading(value) {
    this.setAttribute('loading', value);
  }

  get type() {
    return this.getAttribute('type') || 'module';
  }

  set type(value) {
    this.setAttribute('type', value);
  }

  get state() {
    return this[APPLICATION_SERVICE].getState();
  }

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

  get name() {
    return this.getAttribute('name') || '';
  }

  set name(value) {
    this.setAttribute('name', value);
  }

  get src() {
    const value = this.getAttribute('src');
    return value === null ? '' : new URL(value, this.baseURI).href;
  }

  set src(value) {
    this.setAttribute('src', value);
  }

  get import() {
    const value = this.getAttribute('import');
    return value === null ? '' : value;
  }

  set import(value) {
    this.setAttribute('import', value);
  }

  get text() {
    return this.getAttribute('text') || '';
  }

  set text(value) {
    this.setAttribute('text', value);
  }

  get timeouts() {
    return this[TIMEOUTS] || this.constructor.timeouts;
  }

  set timeouts(value) {
    this[TIMEOUTS] = value;
  }

  createDependencies() {
    return new WebWidgetDependencies(this);
  }

  createSandbox() {
    return new WebWidgetSandbox(this);
  }

  createRenderRoot() {
    let renderRoot;
    const { sandboxed, sandbox } = this;

    if (sandboxed) {
      const sandboxDoc = sandbox.window.document;
      const style = sandboxDoc.createElement('style');
      style.textContent = `body{margin:0}`;
      sandboxDoc.head.appendChild(style);
      renderRoot = sandboxDoc.body;
    } else {
      renderRoot = this.attachShadow({ mode: 'closed' });
      autoUpdateElement(renderRoot);
    }

    return renderRoot;
  }

  async createLoader() {
    const { type } = this;
    const loader = this.constructor.loaders.get(type);

    if (!loader) {
      throw Error(`Loader is not defined: ${type}`);
    }

    return loader(this);
  }

  async load() {
    await this[TRIGGER]('load');
  }

  async bootstrap() {
    await this[TRIGGER]('bootstrap');
  }

  async mount() {
    await this[TRIGGER]('mount');
  }

  async update(properties = {}) {
    const dependencies = this.dependencies || {};
    Object.assign(dependencies, properties);
    await this[TRIGGER]('update');
  }

  async unmount() {
    const portals = this.portals || [];
    await this[TRIGGER]('unmount');
    await Promise.all(portals.map(widget => widget.unmount()));
  }

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
        this.movedCallback();
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

  [TRY_AUTO_LOAD]() {
    this[TRY_AUTO_LOAD_TIMER] = setTimeout(() => {
      if (isAutoLoad(this)) {
        this.mount().catch(this[THROW_GLOBAL_ERROR].bind(this));
      }
      clearTimeout(this[TRY_AUTO_LOAD_TIMER]);
    });
  }

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

  [TRIGGER](name) {
    return this[APPLICATION_SERVICE].trigger(name, [this.dependencies]);
  }

  [STATECHANGE_CALLBACK]() {
    const state = this.state;
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

  [PARENT_WIDGET]() {
    const parentWidgetElement = getParentNode(this, this.constructor);
    if (parentWidgetElement) {
      return parentWidgetElement;
    }
    return null;
  }

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

  static get portalDestinations() {
    return globalPortalDestinations;
  }

  static get loaders() {
    return globalLoaders;
  }

  static get timeouts() {
    return globalTimeouts;
  }

  static set timeouts(value) {
    globalTimeouts = value;
  }
}

export function bootstrap() {
  customElements.define(LOCAL_NAME, HTMLWebWidgetElement);
  document.querySelectorAll(`[is=${LOCAL_NAME}]`).forEach(updateElement);
  autoUpdateElement(document);
}

Object.assign(HTMLWebWidgetElement, status);
globalLoaders.define('module', moduleLoader);

window.HTMLWebWidgetElement = HTMLWebWidgetElement;

if (window.WEB_WIDGET_BOOTSTRAP !== false) {
  bootstrap();
}
