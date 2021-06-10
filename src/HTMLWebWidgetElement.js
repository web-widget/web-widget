/* global window, customElements, Event */
import {
  NOT_LOADED,
  LOADING_SOURCE_CODE,
  NOT_BOOTSTRAPPED,
  BOOTSTRAPPING,
  NOT_MOUNTED,
  MOUNTING,
  MOUNTED,
  UPDATING,
  UNMOUNTING,
  UNLOADING,
  LOAD_ERROR,
  BOOTSTRAPP_ERROR,
  MOUNT_ERROR,
  UPDAT_ERROR,
  UNMOUNT_ERROR,
  UNLOAD_ERROR,
  SKIP_BECAUSE_BROKEN
} from './WebWidget/applications/status.js';
import {
  appendSourceUrl,
  scriptSourceLoader,
  UMDParser
} from './utils/script-loader.js';
import { Model } from './WebWidget/applications/models.js';
import { toBootstrapPromise } from './WebWidget/lifecycles/bootstrap.js';
import { toLoadPromise } from './WebWidget/lifecycles/load.js';
import { toMountPromise } from './WebWidget/lifecycles/mount.js';
import { toUnloadPromise } from './WebWidget/lifecycles/unload.js';
import { toUnmountPromise } from './WebWidget/lifecycles/unmount.js';
import { toUpdatePromise } from './WebWidget/lifecycles/update.js';
import WebWidgetPortalRegistry from './WebWidgetPortalRegistry.js';
import HTMLWebSandboxBaseInterface from './HTMLWebSandboxBaseInterface.js';

const HTMLWebSandboxElement =
  window.HTMLWebSandboxElement || HTMLWebSandboxBaseInterface;
const rootPortalRegistry = new WebWidgetPortalRegistry();

const AUTOLOAD_DISABLED = HTMLWebSandboxElement.HTMLWebSandboxElement;
const SANDBOX_INSTANCE = HTMLWebSandboxElement.SANDBOX_INSTANCE;
const CONFIG = Symbol('config');
const PARSER = Symbol('parser');
const MODEL = Symbol('model');
const APPLICATION = Symbol('application');
const RESOURCE_LOAD_EVENT = Symbol('resourceLoaded');

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

const toLoader = (target, sandbox, parser) => {
  let loader = target;

  if (typeof target === 'string') {
    const url = target;
    const fn = () =>
      scriptSourceLoader(url).then(source => {
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
};

const getParentWebWidgetElement = view => {
  let current = view;
  do {
    current = current.getRootNode().host;
    if (current && current[MODEL]) {
      return current;
    }
  } while (current);
  return null;
};

const getChildWebWidgetElements = view => {
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
};

const getParentModel = view => {
  const parentWidgetElement = getParentWebWidgetElement(view);
  if (parentWidgetElement) {
    return parentWidgetElement[MODEL];
  }
  return null;
};

const getChildModels = view => {
  const model = view[MODEL];
  const shadowRoot = model.shadow;
  const childWebWidgetElements = [
    ...getChildWebWidgetElements(view),
    ...getChildWebWidgetElements(shadowRoot)
  ];
  const childModels = childWebWidgetElements.map(
    webWidgetElement => webWidgetElement[MODEL]
  );
  childModels.push(...model.portals);

  return childModels;
};

const getDataset = view => {
  const data = {};
  const includeDataId = view.getAttribute('include-data');

  if (includeDataId) {
    const dataSourceNode =
      includeDataId && view.ownerDocument.getElementById(includeDataId);
    const dataSourceContent = dataSourceNode && dataSourceNode.textContent;
    if (dataSourceContent) {
      Object.assign(data, JSON.parse(dataSourceContent));
    }
  }

  Object.assign(data, view.dataset);
  return data;
};

const tryAutoLoad = view => {
  if (isAutoLoad(view)) {
    view.mount();
  }
};

const tryAutoUnload = view => {
  if (isBindingElementLifecycle(view)) {
    view.unload();
  }
};

const createWebWidget = view => {
  if (view[MODEL]) {
    return view[MODEL];
  }

  if (!isResourceReady(view)) {
    throw new Error('Resources are not yet ready');
  }

  let container, shadow;
  const src = getProperty(view, 'src');
  const text = getProperty(view, 'text');
  const application = getProperty(view, 'application');
  const debug = getProperty(view, 'debug');
  const parser = getProperty(view, PARSER) || UMDParser;
  const id = view.id;
  const name =
    view.name || (application ? application.name : view.id || view.localName);
  const sandbox = view[SANDBOX_INSTANCE];
  const url = src || application.url; /// /
  const main = src || application || (async () => text);
  const data = getDataset(view);
  const properties = { data };

  if (sandbox) {
    const sandboxDoc = sandbox.global.document;
    const style = sandboxDoc.createElement('style');

    style.textContent = `body{margin:0}`;
    sandboxDoc.head.appendChild(style);
    container = sandbox.global.document.body;
    shadow = sandbox.toNative(sandbox.global.document);
  } else {
    container = shadow = view.attachShadow({ mode: 'closed' });
  }

  const parent = () => getParentModel(view);
  const children = () => getChildModels(view);
  const loader = toLoader(main, sandbox, parser);

  view[MODEL] = new Model({
    children,
    container,
    debug,
    id,
    loader,
    name,
    parent,
    properties,
    rootPortalRegistry,
    sandbox,
    shadow,
    url,
    view
  });

  return view[MODEL];
};

class HTMLWebWidgetElement extends HTMLWebSandboxElement {
  constructor() {
    super();

    if (AUTOLOAD_DISABLED) {
      this[AUTOLOAD_DISABLED] = true;
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
    return this.getAttribute('importance') || '';
  }

  set importance(value) {
    this.setAttribute('importance', value);
  }

  get loading() {
    return this.getAttribute('loading') || '';
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
    return NOT_LOADED;
  }

  static get portals() {
    return rootPortalRegistry;
  }

  async load() {
    createWebWidget(this);
    const loadPromise = toLoadPromise(this[MODEL]);

    if (this.src && !this[RESOURCE_LOAD_EVENT]) {
      this[RESOURCE_LOAD_EVENT] = true;
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

  async update(properties) {
    if (!this[MODEL]) {
      throw new Error('Uninitialized');
    }
    this[MODEL].properties = properties;
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

  lifecycleCallback(type, ...params) {
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

        if (this.sandboxed) {
          if (typeof super.evaluate !== 'function') {
            throw new Error(
              `"window.HTMLWebSandboxElement" is required to run the sandbox`
            );
          }
          super.lifecycleCallback(...arguments);
        }

        tryAutoLoad(this);
        break;

      case 'destroyed':
        if (this.sandboxed) {
          super.lifecycleCallback(...arguments);
        }

        tryAutoUnload(this);
        break;

      case 'attributeChanged':
        if (this.sandboxed) {
          super.lifecycleCallback(...arguments);
        }

        switch (params[0]) {
          case 'text':
          case 'src':
          case 'inactive':
            tryAutoLoad(this);
            break;
          default:
        }
        break;

      default:
    }
  }

  static get observedAttributes() {
    return ['src', 'text', 'inactive'];
  }
}

Object.assign(HTMLWebWidgetElement, { CONFIG, PARSER, MODEL }); // 内部接口

Object.assign(HTMLWebWidgetElement, {
  NOT_LOADED,
  LOADING_SOURCE_CODE,
  NOT_BOOTSTRAPPED,
  BOOTSTRAPPING,
  NOT_MOUNTED,
  MOUNTING,
  MOUNTED,
  UPDATING,
  UNMOUNTING,
  UNLOADING,
  LOAD_ERROR,
  BOOTSTRAPP_ERROR,
  MOUNT_ERROR,
  UPDAT_ERROR,
  UNMOUNT_ERROR,
  UNLOAD_ERROR,
  SKIP_BECAUSE_BROKEN
});

window.WebWidget = HTMLWebWidgetElement;
window.HTMLWebWidgetElement = HTMLWebWidgetElement;

customElements.define('web-widget', HTMLWebWidgetElement);

export default HTMLWebWidgetElement;
