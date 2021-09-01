/* global window, document, customElements, ShadowRoot, URL, HTMLElement, IntersectionObserver */
import {
  appendSourceUrl,
  scriptSourceLoader,
  umdParser,
  moduleParser
} from './utils/scriptLoader.js';
import { queueMicrotask } from './utils/queueMicrotask.js';
import { createLifecycleCallbacks } from './utils/lifecycleCallbacks.js';
import { getParentNode, getChildNodes } from './utils/nodes.js';
import * as status from './applications/status.js';
import { Model } from './applications/models.js';
import { toBootstrapPromise } from './lifecycles/bootstrap.js';
import { toLoadPromise } from './lifecycles/load.js';
import { toMountPromise } from './lifecycles/mount.js';
import { toUnloadPromise } from './lifecycles/unload.js';
import { toUnmountPromise } from './lifecycles/unmount.js';
import { toUpdatePromise } from './lifecycles/update.js';
import { WebWidgetPortalDestinations } from './WebWidgetPortalDestinations.js';
import { WebWidgetDependencies } from './WebWidgetDependencies.js';

const HTMLWebSandboxElement = window.HTMLWebSandboxElement || undefined;
const rootPortalDestinations = new WebWidgetPortalDestinations();
const PARSER = Symbol('parser');
const MODEL = Symbol('model');
const DATA = Symbol('data');
const APPLICATION = Symbol('application');
const LIFECYCLE_CALLBACK = Symbol('lifecycleCallback');

const isBindingElementLifecycle = view => !view.inactive;
const isResourceReady = view =>
  view.isConnected && (view.src || view.application || view.text);
const isAutoLoad = view =>
  isBindingElementLifecycle(view) && isResourceReady(view);
const isAutoUnload = isBindingElementLifecycle;

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
  const sandbox = model.sandbox;
  const container = model.properties.container;

  if (container instanceof ShadowRoot) {
    shadowRoot = container;
  } else if (sandbox && sandbox.global.document === container) {
    shadowRoot = sandbox.toNative(model.sandbox.global.document);
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

function tryAutoLoad(view) {
  queueMicrotask(() => {
    if (isAutoLoad(view)) {
      view.mount().catch(asyncThrowError);
    }
  });
}

function tryAutoUnload(view) {
  queueMicrotask(() => {
    if (isAutoUnload(view)) {
      view.unload().then(() => {
        if (
          HTMLWebSandboxElement &&
          view[HTMLWebSandboxElement.SANDBOX_INSTANCE]
        ) {
          view[HTMLWebSandboxElement.SANDBOX_DESTROY]();
        }
      }, asyncThrowError);
    }
  });
}

function createModel(view) {
  if (!isResourceReady(view)) {
    throw new Error(`Cannot load: Not initialized`);
  }

  let sandbox;
  const { src, application, sandboxed } = view;
  if (sandboxed) {
    sandbox = view.createSandbox();
  }

  const id = view.id;
  const name =
    view.name ||
    (application ? application.name : view.id || view.name || view.localName);
  const url = src || null;
  const properties = view.createDependencies();
  const parent = () => getParentModel(view);
  const children = () => getChildModels(view);
  const loader = view.loader.bind(view);

  return new Model({
    children,
    id,
    loader,
    name,
    parent,
    properties,
    sandbox,
    url,
    view
  });
}

function preFetch(url) {
  queueMicrotask(() => {
    if (!document.head.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  });
}

function onstatechange({ currentTarget }) {
  if (currentTarget.state === status.MOUNTED) {
    for (const element of currentTarget.children) {
      if (element.localName === 'placeholder') {
        element.hidden = true;
        currentTarget.removeEventListener('statechange', onstatechange);
        break;
      }
    }
  }
}

const lazyImageObserver = new IntersectionObserver(
  entries => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting && isAutoLoad(target)) {
        target.mount();
        lazyImageObserver.unobserve(target);
      }
    });
  },
  {
    rootMargin: '80%'
  }
);

export class HTMLWebWidgetElement extends (HTMLWebSandboxElement ||
  HTMLElement) {
  constructor() {
    super();

    this.addEventListener('statechange', onstatechange);

    if (HTMLWebSandboxElement) {
      this[HTMLWebSandboxElement.SANDBOX_AUTOLOAD_DISABLED] = true;
    }
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

  get type() {
    return this.getAttribute('type') || '';
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

  static get portalDestinations() {
    return rootPortalDestinations;
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

  [PARSER]() {
    const parser = this.type === 'module' ? moduleParser : umdParser;
    return parser(...arguments);
  }

  async loader() {
    const { src, application, text, type, importance } = this;

    if (application) {
      return application;
    }

    if (src) {
      return type === 'module'
        ? import(src).then(module => {
            return module.default || module;
          })
        : scriptSourceLoader(src, { importance }).then(source => {
            const sandbox = this[MODEL].sandbox;
            const module = this[PARSER](appendSourceUrl(source, src), sandbox);
            return module;
          });
    }

    if (text) {
      const sandbox = this[MODEL].sandbox;
      return this[PARSER](text, sandbox);
    }

    throw Error('No target');
  }

  createSandbox() {
    if (!HTMLWebSandboxElement) {
      throw new Error(`"HTMLWebSandboxElement" is required to run the sandbox`);
    }
    return this[HTMLWebSandboxElement.SANDBOX_CREATE]();
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

  [LIFECYCLE_CALLBACK](type, params) {
    let parentModel;
    switch (type) {
      case 'firstConnected':
        parentModel = getParentModel(this);

        if (parentModel) {
          const parentSandboxed = !!parentModel.sandbox;
          if (parentSandboxed) {
            this.sandboxed = parentSandboxed;
          }
        }

        if (this.loading === 'lazy') {
          lazyImageObserver.observe(this);
        } else {
          tryAutoLoad(this);
        }
        break;
      case 'attributeChanged':
        if (params[0] === 'data') {
          delete this[DATA];
          break;
        } else if (this.loading !== 'lazy') {
          if (this.inactive && params[0] === 'src' && params[1]) {
            preFetch(this.src);
          }
          tryAutoLoad(this);
        }
        break;

      case 'destroyed':
        if (this.loading === 'lazy') {
          lazyImageObserver.unobserve(this);
        }
        tryAutoUnload(this);
        break;

      default:
    }
  }

  static get observedAttributes() {
    return ['data', 'src', 'text', 'inactive'];
  }
}

Object.assign(HTMLWebWidgetElement, { PARSER, MODEL }); // 内部接口
Object.assign(HTMLWebWidgetElement, status);
Object.assign(
  HTMLWebWidgetElement.prototype,
  createLifecycleCallbacks(LIFECYCLE_CALLBACK)
);

window.WebWidget = HTMLWebWidgetElement;
window.HTMLWebWidgetElement = HTMLWebWidgetElement;

customElements.define('web-widget', HTMLWebWidgetElement);
