/* global window, document, customElements, Event, ShadowRoot, URL, HTMLElement, IntersectionObserver */
import {
  appendSourceUrl,
  scriptSourceLoader,
  umdParser,
  moduleParser
} from './utils/scriptLoader.js';
import { queueMicrotask } from './utils/queueMicrotask.js';
import { lifecycleCallbacks } from './utils/lifecycleCallbacks.js';
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
const APPLICATION = Symbol('application');
const RESOURCE_LOADED = Symbol('resourceLoaded');

const isBindingElementLifecycle = view => !view.inactive;
const isResourceReady = view =>
  view.isConnected && (view.src || view.application || view.text);
const isAutoLoad = view =>
  isBindingElementLifecycle(view) && isResourceReady(view);
const isAutoUnload = isBindingElementLifecycle;

function getParentWebWidgetElement(view) {
  let current = view;
  do {
    current = current.getRootNode().host;
    if (current && current[MODEL]) {
      return current;
    }
  } while (current);
  return null;
}

function getChildWebWidgetElements(view) {
  const nodes = [];
  const stack = [...view.children];
  while (stack.length) {
    const node = stack.pop();
    if (node[MODEL]) {
      nodes.push(node);
    } else {
      // 限制：如果目标在 shadow dom 内，那么这里无法找到目标
      stack.unshift(...node.children);
    }
  }
  return nodes;
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
  if (isAutoLoad(view)) {
    view.mount();
  }
}

function tryAutoUnload(view) {
  if (isAutoUnload(view)) {
    view.unload().then(() => {
      if (
        HTMLWebSandboxElement &&
        view[HTMLWebSandboxElement.SANDBOX_INSTANCE]
      ) {
        view[HTMLWebSandboxElement.SANDBOX_DESTROY]();
      }
    });
  }
}

function createWebWidget(view) {
  if (view[MODEL]) {
    return view[MODEL];
  }

  if (!isResourceReady(view)) {
    throw new Error('Not initialized');
  }

  let sandbox;
  const { src, application, debug, sandboxed } = view;
  if (sandboxed) {
    sandbox = view.createSandbox();
  }

  const id = view.id;
  const name =
    view.name || (application ? application.name : view.id || view.localName);
  const url = src || application.url; /// /
  const properties = view.createDependencies();
  const parent = () => getParentModel(view);
  const children = () => getChildModels(view);
  const loader = view.loader.bind(view);

  view[MODEL] = new Model({
    children,
    debug,
    id,
    loader,
    name,
    parent,
    properties,
    sandbox,
    url,
    view
  });

  return view[MODEL];
}

function preFetch(url) {
  if (!document.head.querySelector(`link[href="${url}"]`)) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
}

const lazyImageObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      tryAutoLoad(entry.target);
      lazyImageObserver.unobserve(entry.target);
    }
  });
});

export class HTMLWebWidgetElement extends (HTMLWebSandboxElement ||
  HTMLElement) {
  constructor() {
    super();
    if (HTMLWebSandboxElement) {
      this[HTMLWebSandboxElement.SANDBOX_AUTOLOAD_DISABLED] = true;
    }
  }

  get application() {
    return this[APPLICATION] || null;
  }

  set application(main) {
    if (typeof main === 'function') {
      this[APPLICATION] = main;
      tryAutoLoad(this);
    }
  }

  get inactive() {
    return this.getAttribute('inactive') !== null;
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
    return this.getAttribute('sandboxed') !== null;
  }

  set sandboxed(value) {
    if (value) {
      this.setAttribute('sandboxed', '');
    } else {
      this.removeAttribute('sandboxed');
    }
  }

  get type() {
    return this.getAttribute('type') || 'auto';
  }

  set type(value) {
    this.setAttribute('type', value);
  }

  get status() {
    if (this[MODEL]) {
      return this[MODEL].status;
    }
    return status.NOT_LOADED;
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

  // eslint-disable-next-line consistent-return
  async loader() {
    const view = this;
    const { src, application, text, type, importance } = view;

    if (application) {
      return application;
    }

    if (src) {
      return type === 'module'
        ? import(src).then(module => {
            return module.default || module;
          })
        : scriptSourceLoader(src, { importance }).then(source => {
            const sandbox = view[MODEL].sandbox;
            const module = this[PARSER](appendSourceUrl(source, src), sandbox);
            return module;
          });
    }

    if (text) {
      const sandbox = view[MODEL].sandbox;
      return this[PARSER](text, sandbox);
    }
  }

  createSandbox() {
    if (!HTMLWebSandboxElement) {
      throw new Error(`"HTMLWebSandboxElement" is required to run the sandbox`);
    }
    return this[HTMLWebSandboxElement.SANDBOX_CREATE]();
  }

  async load() {
    createWebWidget(this);
    const loadPromise = toLoadPromise(this[MODEL]);

    if (this.src && !this[RESOURCE_LOADED]) {
      this[RESOURCE_LOADED] = true;
      loadPromise.then(
        () => {
          this.dispatchEvent(new Event('load'));
        },
        () => {
          this.dispatchEvent(new Event('error'));
        }
      );
    }

    return loadPromise;
  }

  async bootstrap() {
    await this.load();
    await toBootstrapPromise(this[MODEL]);
  }

  async mount() {
    await this.bootstrap();
    await toMountPromise(this[MODEL]);
  }

  async update(properties = {}) {
    if (!this[MODEL]) {
      throw new Error('Not initialized');
    }
    Object.assign(this[MODEL].properties, properties);
    await toUpdatePromise(this[MODEL]);
  }

  async unmount() {
    if (!this[MODEL]) {
      return;
    }
    await toUnmountPromise(this[MODEL]);
  }

  async unload() {
    if (!this[MODEL]) {
      return;
    }
    await this.unmount();
    await toUnloadPromise(this[MODEL]);
  }

  lifecycleCallback(type) {
    let parentModel;
    switch (type) {
      case 'firstConnected':
        parentModel = getParentModel(this);

        if (parentModel) {
          const parentSandboxed = !!parentModel.sandbox;
          if (parentSandboxed) {
            this.sandboxed = parentSandboxed;
          }
          // TODO 继承 baseURI
        }

        if (this.loading === 'lazy') {
          lazyImageObserver.observe(this);
        } else {
          queueMicrotask(() => {
            tryAutoLoad(this);
          });
        }
        break;
      case 'attributeChanged':
        if (this.loading !== 'lazy') {
          if (arguments[1] === 'src' && arguments[3]) {
            queueMicrotask(() => {
              preFetch(this.src);
            });
          }
          queueMicrotask(() => {
            tryAutoLoad(this);
          });
        }
        break;

      case 'destroyed':
        if (this.loading === 'lazy') {
          lazyImageObserver.unobserve(this);
        }
        queueMicrotask(() => {
          tryAutoUnload(this);
        });
        break;

      default:
    }
  }

  static get observedAttributes() {
    return ['src', 'text', 'inactive'];
  }
}

Object.assign(HTMLWebWidgetElement, { PARSER, MODEL }); // 内部接口
Object.assign(HTMLWebWidgetElement, status);
Object.assign(HTMLWebWidgetElement.prototype, lifecycleCallbacks);

window.WebWidget = HTMLWebWidgetElement;
window.HTMLWebWidgetElement = HTMLWebWidgetElement;

customElements.define('web-widget', HTMLWebWidgetElement);
