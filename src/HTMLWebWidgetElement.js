/* global window, customElements, Event, ShadowRoot, URL, HTMLElement, IntersectionObserver */
import {
  appendSourceUrl,
  scriptSourceLoader,
  UMDParser
} from './utils/script-loader.js';
import { queueMicrotask } from './utils/queueMicrotask.js';
import { lifecycleCallbacks } from './utils/lifecycleCallbacks.js';
import * as status from './WebWidget/applications/status.js';
import * as properties from './WebWidget/properties/properties.js';
import { Model } from './WebWidget/applications/models.js';
import { toBootstrapPromise } from './WebWidget/lifecycles/bootstrap.js';
import { toLoadPromise } from './WebWidget/lifecycles/load.js';
import { toMountPromise } from './WebWidget/lifecycles/mount.js';
import { toUnloadPromise } from './WebWidget/lifecycles/unload.js';
import { toUnmountPromise } from './WebWidget/lifecycles/unmount.js';
import { toUpdatePromise } from './WebWidget/lifecycles/update.js';
import WebWidgetPortalRegistry from './WebWidgetPortalRegistry.js';

const HTMLWebSandboxElement = window.HTMLWebSandboxElement || undefined;
const rootPortalRegistry = new WebWidgetPortalRegistry();
const CONFIG = Symbol('config');
const PARSER = Symbol('parser');
const MODEL = Symbol('model');
const APPLICATION = Symbol('application');
const RESOURCE_LOADED = Symbol('resourceLoaded');

const lifecyclePropertieCreaters = Object.keys(properties).filter(name =>
  name.startsWith('create')
);
const lifecycleProperties = lifecyclePropertieCreaters.map(name =>
  name.replace(/create([\w])/, ($0, $1) => $1.toLowerCase())
);

const getProperty = (view, name) => {
  const config = view[CONFIG] || {};
  return config[name] || view[name];
};
const isBindingElementLifecycle = view => !getProperty(view, 'inactive');
const isResourceReady = view =>
  view.isConnected &&
  (getProperty(view, 'src') ||
    getProperty(view, 'application') ||
    getProperty(view, 'text'));
const isAutoLoad = view =>
  isBindingElementLifecycle(view) && isResourceReady(view);
const isAutoUnload = isBindingElementLifecycle;

function toLoader(target, sandbox, parser, importance) {
  let loader = target;

  if (typeof target === 'string') {
    const url = target;
    const fn = () =>
      scriptSourceLoader(url, { importance }).then(source => {
        const config = parser(appendSourceUrl(source, url), sandbox);
        return config;
      });
    fn.url = url;
    loader = fn;
  } else if (typeof target !== 'function') {
    loader = () => Promise.resolve(target);
  }

  return (...args) =>
    loader(...args).then(config => {
      if (typeof config === 'string') {
        config = parser(config, sandbox);
      }

      return config;
    });
}

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
  } else if (container === sandbox.global.document) {
    shadowRoot = sandbox.toNative(model.sandbox.global.document);
  }
  const childWebWidgetElements = getChildWebWidgetElements(view);

  if (shadowRoot) {
    childWebWidgetElements.push(...getChildWebWidgetElements(shadowRoot));
  }

  const childModels = childWebWidgetElements.map(
    webWidgetElement => webWidgetElement[MODEL]
  );
  childModels.push(...model.portals);

  return childModels;
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
    throw new Error('Uninitialized');
  }

  let sandbox;
  const src = getProperty(view, 'src');
  const text = getProperty(view, 'text');
  const application = getProperty(view, 'application');
  const debug = getProperty(view, 'debug');
  const parser = getProperty(view, PARSER) || UMDParser;
  const sandboxed = getProperty(view, 'sandboxed');

  if (sandboxed) {
    if (!HTMLWebSandboxElement) {
      throw new Error(`"HTMLWebSandboxElement" is required to run the sandbox`);
    }
    sandbox = view[HTMLWebSandboxElement.SANDBOX_CREATE]();
  }

  const id = view.id;
  const name =
    view.name || (application ? application.name : view.id || view.localName);
  const url = src || application.url; /// /
  const main = src || application || (async () => text);
  const properties = view.createProperties();
  const parent = () => getParentModel(view);
  const children = () => getChildModels(view);
  const loader = toLoader(main, sandbox, parser, view.importance);

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

const lazyImageObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.intersectionRatio > 0) {
      tryAutoLoad(entry.target);
    }
  });
});

class HTMLWebWidgetElement extends (HTMLWebSandboxElement || HTMLElement) {
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
    this[APPLICATION] = main;
    tryAutoLoad(this);
  }

  get inactive() {
    return this.getAttribute('inactive') !== null;
  }

  set inactive(v) {
    return v
      ? this.setAttribute('inactive', '')
      : this.removeAttribute('inactive');
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

  set sandboxed(v) {
    return v
      ? this.setAttribute('sandboxed', '')
      : this.removeAttribute('sandboxed');
  }

  get status() {
    if (this[MODEL]) {
      return this[MODEL].status;
    }
    return status.NOT_LOADED;
  }

  static get portals() {
    return rootPortalRegistry;
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
      throw new Error('Uninitialized');
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

      // eslint-disable-next-line no-fallthrough
      case 'attributeChanged':
        if (this.loading === 'lazy') {
          lazyImageObserver.observe(this);
        } else {
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

Object.assign(HTMLWebWidgetElement, { CONFIG, PARSER, MODEL }); // 内部接口
Object.assign(HTMLWebWidgetElement, status);
Object.assign(HTMLWebWidgetElement.prototype, lifecycleCallbacks);

// 生成应用生命周期函数的 properties 字段的钩子
HTMLWebWidgetElement.lifecycleProperties = lifecycleProperties;
lifecyclePropertieCreaters.reduce((accumulator, name) => {
  accumulator[name] = function hook() {
    return properties[name](
      this[MODEL] || {
        view: this
      }
    );
  };
  return accumulator;
}, HTMLWebWidgetElement.prototype);

window.WebWidget = HTMLWebWidgetElement;
window.HTMLWebWidgetElement = HTMLWebWidgetElement;

customElements.define('web-widget', HTMLWebWidgetElement);

export default HTMLWebWidgetElement;
