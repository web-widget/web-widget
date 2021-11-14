/* global window, document, customElements, ShadowRoot, HTMLElement, Event, IntersectionObserver, URL, MutationObserver */
// eslint-disable-next-line max-classes-per-file
import { createRegistry } from './utils/registry.js';
import { getParentNode, getChildNodes } from './utils/nodes.js';
import { moduleLoader } from './loaders/module.js';
import { queueMicrotask } from './utils/queueMicrotask.js';
import { toBootstrapPromise } from './lifecycles/bootstrap.js';
import { toLoadPromise } from './lifecycles/load.js';
import { toMountPromise } from './lifecycles/mount.js';
import { toUnloadPromise } from './lifecycles/unload.js';
import { toUnmountPromise } from './lifecycles/unmount.js';
import { toUpdatePromise } from './lifecycles/update.js';
import { WebWidgetDependencies } from './WebWidgetDependencies.js';
import { WebWidgetSandbox } from './WebWidgetSandbox.js';
import * as status from './applications/status.js';
import {
  CHILDREN_WIDGET,
  NAME,
  PORTALS,
  PREFETCH,
  SET_STATE
} from './applications/symbols.js';

const APPLICATION = Symbol('application');
const DATA = Symbol('data');
const FIRST_CONNECTED = Symbol('firstConnect');
const INITIALIZATION = Symbol('initialization');
const MOVEING = Symbol('moveing');
const PARENT_WIDGET = Symbol('parentWidget');
const STATE = Symbol('state');
const STATECHANGE_CALLBACK = Symbol('statechangeCallback');

const rootPortalDestinations = createRegistry();
const rootLoaders = createRegistry();

const isBindingElementLifecycle = view => !view.inactive;
const isResourceReady = view =>
  view.isConnected && (view.src || view.application || view.text);
const isAutoPrefetch = view => view.inactive && view.src;
const isAutoLoad = view =>
  isBindingElementLifecycle(view) && isResourceReady(view);
const isAutoUnload = isBindingElementLifecycle;

const lazyObserver = new IntersectionObserver(
  entries => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting && isAutoLoad(target)) {
        target.mount();
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
  if (!customElements.get(newTagName)) {
    // eslint-disable-next-line no-use-before-define
    customElements.define(newTagName, class extends HTMLWebWidgetElement {});
  }
}

function autoUpdateElement(documentOrShadowRoot, localName) {
  return new MutationObserver(mutationsList => {
    for (const mutation of mutationsList) {
      if (mutation.target.getAttribute('is') === localName) {
        updateElement(mutation.target);
      }
    }
  }).observe(documentOrShadowRoot, {
    attributes: true,
    subtree: true,
    attributeFilter: ['is']
  });
}

function asyncThrowError(error) {
  queueMicrotask(() => {
    throw error;
  });
}

function getParentWebWidgetElement(view, constructor) {
  const parentWidgetElement = getParentNode(view, constructor);
  if (parentWidgetElement) {
    return parentWidgetElement;
  }
  return null;
}

function getChildWebWidgetElements(view, constructor) {
  let shadowRoot;
  const container = view.dependencies.container;

  if (container instanceof ShadowRoot) {
    shadowRoot = container;
  }
  const childWebWidgetElements = getChildNodes(view, constructor);

  if (shadowRoot) {
    childWebWidgetElements.push(...getChildNodes(shadowRoot, constructor));
  }

  return [
    ...new Set(
      [...childWebWidgetElements, ...view[PORTALS]].map(
        webWidgetElement => webWidgetElement
      )
    )
  ];
}

function prefetch(url /* , importance */) {
  if (!document.head.querySelector(`link[href="${url}"]`)) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    /* link.importance = importance; */
    link.href = url;
    document.head.appendChild(link);
  }
}

function tryAutoLoad(view) {
  queueMicrotask(() => {
    if (isAutoLoad(view)) {
      view.mount().catch(asyncThrowError);
    } else if (isAutoPrefetch(view)) {
      view[PREFETCH]();
    }
  });
}

function tryAutoUnload(view) {
  queueMicrotask(() => {
    if (isAutoUnload(view)) {
      view.unload().catch(asyncThrowError);
      if (view.sandboxed) {
        view.sandbox.unload();
      }
    }
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
    this.addEventListener('statechange', this[STATECHANGE_CALLBACK]);
  }

  get application() {
    return this[APPLICATION] || null;
  }

  set application(value) {
    if (typeof value === 'function') {
      this[APPLICATION] = value;
      tryAutoLoad(this);
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
        asyncThrowError(error);
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
    return this[STATE] || status.INITIAL;
  }

  [SET_STATE](value) {
    if (value !== this[STATE]) {
      this[STATE] = value;
      this.dispatchEvent(new Event('statechange'));
    }
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

  get text() {
    return this.getAttribute('text') || '';
  }

  set text(value) {
    this.setAttribute('text', value);
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
      autoUpdateElement(renderRoot, this.localName);
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
    if (!this[INITIALIZATION]) {
      if (!isResourceReady(this)) {
        throw new Error(`Cannot load: Not initialized`);
      }

      const { application } = this;
      this[NAME] =
        this.name ||
        this.src ||
        (application ? application.name : this.name || this.localName);
      this.dependencies = this.createDependencies();
      this.sandbox = this.sandboxed ? this.createSandbox() : null;
      this.renderRoot = null;
      this.loader = application
        ? async () => application
        : this.createLoader.bind(this);
      this[INITIALIZATION] = true;

      if (this.sandboxed && !this.sandbox.window) {
        throw new Error(`Sandbox mode is not implemented`);
      }
    }

    await toLoadPromise(this);
  }

  async bootstrap() {
    if (this.state !== status.LOADED) {
      await this.load();
    }
    await toBootstrapPromise(this);
  }

  async mount() {
    if (this.state !== status.BOOTSTRAPPED) {
      await this.bootstrap();
    }
    await toMountPromise(this);
  }

  async update(properties = {}) {
    if (this.state !== status.MOUNTED) {
      throw new Error(`Cannot update: Not mounted`);
    }

    Object.assign(this.dependencies, properties);

    await toUpdatePromise(this);
  }

  async unmount() {
    if (this.state === status.MOUNTED) {
      await toUnmountPromise(this);
    }
  }

  async unload() {
    if (this.state === status.MOUNTED) {
      await this.unmount();
    }

    if ([status.BOOTSTRAPPED, status.MOUNTED].includes(this.state)) {
      await toUnloadPromise(this);
    }
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

  // 生命周期扩展：第一次插入文档
  firstConnectedCallback() {
    // 继承 sandboxed 与 csp
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
      tryAutoLoad(this);
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
    }
    if (this.loading !== 'lazy') {
      tryAutoLoad(this);
    }
  }

  // 生命周期扩展：从文档中销毁
  destroyedCallback() {
    if (this.loading === 'lazy') {
      removeLazyLoad(this);
    }
    tryAutoUnload(this);
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

  [PREFETCH]() {
    prefetch(this.src, this.importance);
  }

  [PARENT_WIDGET]() {
    return getParentWebWidgetElement(this, this.constructor);
  }

  [CHILDREN_WIDGET]() {
    return getChildWebWidgetElements(this, this.constructor);
  }

  static get observedAttributes() {
    return ['data', 'src', 'text', 'inactive'];
  }

  static get portalDestinations() {
    return rootPortalDestinations;
  }

  static get loaders() {
    return rootLoaders;
  }
}

export function bootstrap(tagName = 'web-widget') {
  customElements.define(tagName, HTMLWebWidgetElement);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoUpdateElement(document, tagName);
    });
  } else {
    document.querySelectorAll(`[is=${tagName}]`).forEach(updateElement);
  }
}

Object.assign(HTMLWebWidgetElement, status);
rootLoaders.define('module', moduleLoader);

window.HTMLWebWidgetElement = HTMLWebWidgetElement;

if (window.WEB_WIDGET_BOOTSTRAP !== false) {
  bootstrap();
}
