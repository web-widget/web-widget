/* global window, document, customElements, ShadowRoot, URL, HTMLElement, IntersectionObserver */
import { queueMicrotask } from './utils/queueMicrotask.js';
import { createRegistry } from './utils/registry.js';
import { createLifecycleCallbacks } from './utils/lifecycleCallbacks.js';
import { getParentNode, getChildNodes } from './utils/nodes.js';
import * as status from './applications/status.js';
import { Model } from './applications/models.js';
import { moduleLoader } from './loaders/module.js';
import { toBootstrapPromise } from './lifecycles/bootstrap.js';
import { toLoadPromise } from './lifecycles/load.js';
import { toMountPromise } from './lifecycles/mount.js';
import { toUnloadPromise } from './lifecycles/unload.js';
import { toUnmountPromise } from './lifecycles/unmount.js';
import { toUpdatePromise } from './lifecycles/update.js';
import { WebWidgetDependencies } from './WebWidgetDependencies.js';

const MODEL = Symbol('model');
const DATA = Symbol('data');
const PREFETCH = Symbol('prefetch');
const APPLICATION = Symbol('application');
const LIFECYCLE_CALLBACK = Symbol('lifecycleCallback');
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

function asyncThrowError(error) {
  queueMicrotask(() => {
    throw error;
  });
}

function getParentWebWidgetElement(view) {
  // eslint-disable-next-line no-use-before-define
  return getParentNode(view, HTMLWebWidgetElement);
}

function getChildWebWidgetElements(view) {
  // eslint-disable-next-line no-use-before-define
  return getChildNodes(view, HTMLWebWidgetElement);
}

function getParentModel(view) {
  const parentWidgetElement = getParentWebWidgetElement(view);
  if (parentWidgetElement) {
    return parentWidgetElement[MODEL];
  }
  return null;
}

function getChildModels(view) {
  let shadowRoot;
  const model = view[MODEL];
  const container = model.properties.container;

  if (container instanceof ShadowRoot) {
    shadowRoot = container;
  }
  const childWebWidgetElements = getChildWebWidgetElements(view);

  if (shadowRoot) {
    childWebWidgetElements.push(...getChildWebWidgetElements(shadowRoot));
  }

  return [
    ...new Set(
      [...childWebWidgetElements, ...model.portals].map(
        webWidgetElement => webWidgetElement[MODEL]
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
    }
  });
}

function addLazyLoad(view) {
  lazyObserver.observe(view);
}

function removeLazyLoad(view) {
  lazyObserver.unobserve(view);
}

function createModel(view) {
  if (!isResourceReady(view)) {
    throw new Error(`Cannot load: Not initialized`);
  }

  const { id, src, application } = view;
  const name =
    view.name || (application ? application.name : view.name || view.localName);
  const url = src || null;
  const properties = view.createDependencies();
  const parent = () => getParentModel(view);
  const children = () => getChildModels(view);
  const loader = application
    ? async () => application
    : view.createLoader.bind(view);

  return new Model({
    children,
    id,
    loader,
    name,
    parent,
    properties,
    url,
    view
  });
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
    if (this[MODEL]) {
      return this[MODEL].state;
    }
    return status.INITIAL;
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

  // eslint-disable-next-line consistent-return
  async createLoader() {
    const { src, text, type, name } = this;
    const loader = this.constructor.loaders.get(type);

    if (!loader) {
      throw Error(`Loader is not defined: ${type}`);
    }

    return loader({ src, text, type, name });
  }

  async load() {
    if (!this[MODEL]) {
      this[MODEL] = createModel(this);
    }

    await toLoadPromise(this[MODEL]);
  }

  async bootstrap() {
    if (this.state !== status.LOADED) {
      await this.load();
    }
    await toBootstrapPromise(this[MODEL]);
  }

  async mount() {
    if (this.state !== status.BOOTSTRAPPED) {
      await this.bootstrap();
    }
    await toMountPromise(this[MODEL]);
  }

  async update(properties = {}) {
    if (this.state !== status.MOUNTED) {
      throw new Error(`Cannot update: Not mounted`);
    }

    Object.assign(this[MODEL].properties, properties);

    await toUpdatePromise(this[MODEL]);
  }

  async unmount() {
    if (this.state === status.MOUNTED) {
      await toUnmountPromise(this[MODEL]);
    }
  }

  async unload() {
    if (this.state === status.MOUNTED) {
      await this.unmount();
    }

    if ([status.BOOTSTRAPPED, status.MOUNTED].includes(this.state)) {
      await toUnloadPromise(this[MODEL]);
    }
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

  [LIFECYCLE_CALLBACK](type, params) {
    switch (type) {
      case 'firstConnected':
        if (this.loading === 'lazy') {
          addLazyLoad(this);
        } else {
          tryAutoLoad(this);
        }
        break;
      case 'attributeChanged':
        if (params[0] === 'data') {
          delete this[DATA];
          break;
        }
        if (this.loading !== 'lazy') {
          tryAutoLoad(this);
        }
        break;

      case 'destroyed':
        if (this.loading === 'lazy') {
          removeLazyLoad(this);
        }
        tryAutoUnload(this);
        break;

      default:
    }
  }

  [PREFETCH]() {
    prefetch(this.src, this.importance);
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

rootLoaders.define('module', moduleLoader);

Object.assign(HTMLWebWidgetElement, { MODEL }); // 内部接口
Object.assign(HTMLWebWidgetElement, status);
Object.assign(
  HTMLWebWidgetElement.prototype,
  createLifecycleCallbacks(LIFECYCLE_CALLBACK)
);

window.WebWidget = HTMLWebWidgetElement;
window.HTMLWebWidgetElement = HTMLWebWidgetElement;
customElements.define('web-widget', HTMLWebWidgetElement);
