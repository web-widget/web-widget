import type { Meta } from '@web-widget/helpers';
import {
  mountLifecycleCacheLayer,
  callSyncCacheProvider,
} from '@web-widget/lifecycle-cache/client';
import type { SerializableObject } from './types';
import { createIdleObserver } from './utils/idle';
import { createVisibleObserver } from './utils/lazy';
import { triggerModulePreload } from './utils/module-preload';
import { queueMicrotask } from './utils/queue-microtask';
import { reportError } from './utils/report-error';
import {
  Lifecycle,
  ModuleContainer,
  ModuleLoader,
  Status,
  status,
  Timeouts,
} from './container';

declare const importShim: <T>(src: string) => Promise<T>;
let globalTimeouts: Timeouts = Object.create(null);

const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'innerHTML'
)!;
const innerHTMLSetter = innerHTMLDescriptor.set!;

export type PerformanceMarkDetail = {
  name: string;
  import: string;
};

export const INNER_HTML_PLACEHOLDER = `<!--web-widget:placeholder-->`;

/**
 * Web Widget Container
 * @event {Event} statuschange
 */
export class HTMLWebWidgetElement extends HTMLElement {
  #loader: ModuleLoader | null = null;

  #moduleContainer: ModuleContainer | null = null;

  #data: SerializableObject | null = null;

  #disconnectObserver?: () => void;

  #meta: Meta | null = null;

  #isFirstConnect = false;

  #timeouts: Timeouts | null = null;

  #status: Status = status.INITIAL;

  #internals?: ElementInternals;

  constructor() {
    super();

    if (this.attachInternals) {
      this.#internals = this.attachInternals();
    }
  }

  get #ready() {
    return (
      this.isConnected &&
      this.status === status.INITIAL &&
      !this.inactive &&
      (this.import || this.loader)
    );
  }

  #autoMount() {
    if (!this.#ready) return;
    queueMicrotask(async () => {
      try {
        await this.load();
        await this.bootstrap();
        await this.mount();
      } catch (error) {
        await this.#handleMountError(error as Error);
      }
    });
  }

  async #handleMountError(error: Error) {
    try {
      await this.#call('retry');
    } catch {
      this.#throwGlobalError(error);
    }
  }

  /**
   * WidgetModule loader.
   * @default null
   */
  get loader() {
    return this.#loader || null;
  }

  set loader(value) {
    if (typeof value === 'function') {
      this.#loader = value;
      if (this.loading === 'eager') {
        this.#autoMount();
      }
    }
  }

  /**
   * WidgetModule base.
   */
  get base() {
    const value = this.getAttribute('base');
    return value === null ? this.baseURI : new URL(value, this.baseURI).href;
  }

  set base(value) {
    this.setAttribute('base', value);
  }

  /**
   * WidgetModule data.
   * @deprecated Use `contextData` instead.
   */
  get data(): SerializableObject | null {
    console.warn('`data` is deprecated. Use `contextData` instead.');
    return this.contextData;
  }

  set data(value: SerializableObject) {
    if (typeof value === 'object') {
      this.setAttribute('data', JSON.stringify(value));
    }
  }

  /**
   * WidgetModule data.
   */
  get contextData(): SerializableObject | null {
    if (!this.#data) {
      const dataAttr =
        this.getAttribute('contextdata') ??
        // @deprecated
        this.getAttribute('data');
      if (dataAttr) {
        try {
          const parsedData = JSON.parse(dataAttr);
          if (parsedData !== null) {
            this.#data = parsedData;
          } else {
            throw new Error('Invalid contextData format');
          }
        } catch (error) {
          this.#throwGlobalError(error as TypeError);
          this.#data = {};
        }
        // @deprecated
      } else if (Object.entries(this.dataset).length) {
        this.#data = { ...(this.dataset as SerializableObject) };
      }
    }
    return this.#data;
  }

  set contextData(value: SerializableObject) {
    if (typeof value === 'object') {
      this.#data = value;
    }
  }

  /**
   * WidgetModule meta.
   */
  get contextMeta(): Meta | null {
    if (!this.#meta) {
      const dataAttr = this.getAttribute('contextmeta');
      if (dataAttr) {
        try {
          this.#meta = JSON.parse(dataAttr);
        } catch (error) {
          this.#throwGlobalError(error as TypeError);
          this.#meta = {};
        }
      }
    }
    return this.#meta;
  }

  set contextMeta(value: Meta) {
    if (typeof value === 'object') {
      this.setAttribute('contextmeta', JSON.stringify(value));
    }
  }

  /**
   * Whether the module is inactive.
   */
  get inactive(): boolean {
    return this.hasAttribute('inactive');
  }

  set inactive(value: boolean) {
    if (value) {
      this.setAttribute('inactive', '');
    } else {
      this.removeAttribute('inactive');
    }
  }

  /**
   * Hydration mode.
   * @default false
   */
  get recovering(): boolean {
    return this.hasAttribute('recovering');
  }

  set recovering(value: boolean) {
    if (value) {
      this.setAttribute('recovering', '');
    } else {
      this.removeAttribute('recovering');
    }
  }

  /**
   * Indicates how the browser should load the module.
   * @default "eager"
   */
  get loading(): 'eager' | 'lazy' | 'idle' {
    return (
      (this.getAttribute('loading') as 'eager' | 'lazy' | 'idle' | null) ||
      'eager'
    );
  }

  set loading(value: 'eager' | 'lazy' | 'idle') {
    this.setAttribute('loading', value);
  }

  /**
   * WidgetModule container status.
   * @default "initial"
   */
  get status(): Status {
    return this.#status;
  }

  /**
   * WidgetModule module url.
   * @default ""
   */
  get import() {
    let value = this.getAttribute('import');
    const bareImportRE = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/;
    if (value && !bareImportRE.test(value)) {
      value = new URL(value, this.base).href;
    }
    return value === null ? '' : value;
  }

  set import(value) {
    this.setAttribute('import', value);
  }

  /**
   * WidgetModule render target.
   * @default "shadow"
   */
  get renderTarget(): 'light' | 'shadow' {
    return (this.getAttribute('rendertarget') as 'light') || 'shadow';
  }

  set renderTarget(value: 'light' | 'shadow') {
    this.setAttribute('rendertarget', value);
  }

  /**
   * WidgetModule timeouts.
   */
  get timeouts() {
    if (!this.#timeouts) {
      this.#timeouts = { ...HTMLWebWidgetElement.timeouts };
    }
    return this.#timeouts;
  }

  set timeouts(value) {
    this.#timeouts = value || null;
  }

  // NOTE: This is a temporary solution for React.
  // NOTE: Prevent React components from clearing innerHTML when re-rendering on the client side.
  set innerHTML(value: string) {
    if (value === INNER_HTML_PLACEHOLDER) {
      return;
    } else {
      innerHTMLSetter.call(this, value);
    }
  }

  /**
   * Hook: Create the module's render node.
   */
  createContainer(): Element | DocumentFragment {
    let container: Element | DocumentFragment | null = null;
    if (this.renderTarget === 'shadow') {
      if (this.recovering) {
        container = this.#internals?.shadowRoot ?? null;
      }
      if (!container) {
        container = this.attachShadow({ mode: 'open' });
      }
    } else if (this.renderTarget === 'light') {
      container = this;
    }
    return container as Element | DocumentFragment;
  }

  /**
   * Hook: Create the module's loader.
   */
  createLoader(): ModuleLoader {
    // @see https://github.com/WICG/import-maps#feature-detection
    const supportsImportMaps =
      HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');
    function importModule(target: string) {
      if (!supportsImportMaps && typeof importShim === 'function') {
        // @see https://github.com/guybedford/es-module-shims
        // eslint-disable-next-line no-undef
        return importShim(target);
      }
      return import(/* @vite-ignore */ /* webpackIgnore: true */ target);
    }
    return () => importModule(this.import);
  }

  /**
   * Trigger the loading of the module.
   */
  async load(): Promise<void> {
    await this.#call('load');
  }

  /**
   * Trigger the bootstrapping of the module.
   */
  async bootstrap(): Promise<void> {
    await this.#call('bootstrap');
  }

  /**
   * Trigger the mounting of the module.
   */
  async mount(): Promise<void> {
    await callSyncCacheProvider(() => this.#call('mount'));
  }

  /**
   * Trigger the updating of the module.
   */
  async update(data: any): Promise<void> {
    await this.#call('update', data);
  }

  /**
   * Trigger the unmounting of the module.
   */
  async unmount(): Promise<void> {
    await this.#call('unmount');
  }

  /**
   * Trigger the unloading of the module.
   */
  async unload(): Promise<void> {
    await this.#call('unload');
  }

  connectedCallback() {
    /** connected */
    if (!this.#isFirstConnect) {
      this.#firstConnectedCallback();
      this.#isFirstConnect = true;
    }
  }

  #firstConnectedCallback() {
    const preload = () => this.import && triggerModulePreload(this.import);
    const options: AddEventListenerOptions = { once: true, passive: true };

    ['mousemove', 'touchstart'].forEach((type) =>
      this.addEventListener(type, preload, options)
    );

    const loadingStrategies = {
      eager: () => this.#autoMount(),
      lazy: () =>
        (this.#disconnectObserver = createVisibleObserver(this, () =>
          this.#autoMount()
        )),
      idle: () =>
        (this.#disconnectObserver = createIdleObserver(this, () =>
          this.#autoMount()
        )),
    };

    loadingStrategies[this.loading]?.();
  }

  disconnectedCallback() {
    /** disconnected */
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.destroyedCallback();
      }
    });
  }

  attributeChangedCallback(name: string) {
    const cacheClearingAttributes = ['contextdata', 'data', 'contextmeta'];
    if (cacheClearingAttributes.includes(name)) {
      this.#data = null;
      this.#meta = null;
    }
    if (this.loading === 'eager') {
      this.#autoMount();
    }
  }

  destroyedCallback() {
    if (this.#disconnectObserver) {
      this.#disconnectObserver();
    }
    if (!this.inactive) {
      this.unmount()
        .then(() => this.unload())
        .catch((error) => this.#throwGlobalError(error));
    }
  }

  async #call(lifecycle: Lifecycle | 'retry', data?: SerializableObject) {
    if (!this.#moduleContainer) {
      this.#moduleContainer = this.#createModuleContainer();
    }
    return this.#moduleContainer[lifecycle](data);
  }

  #createModuleContainer() {
    const view = this;
    let container: Element | DocumentFragment;
    const { recovering, contextData } = this;
    const moduleContainer = new ModuleContainer<unknown>(
      () => {
        if (!this.loader) {
          this.loader = this.createLoader();
        }
        return this.loader();
      },
      contextData,
      {
        get container() {
          if (!container) {
            container = view.createContainer();
          }
          return container;
        },
        get recovering() {
          return recovering;
        },
      }
    );
    moduleContainer.timeouts = this.#timeouts;
    moduleContainer.onStatusChange = (status) => {
      this.#statusChangeCallback(status);
    };
    return moduleContainer;
  }

  #statusChangeCallback(value: Status) {
    this.#status = value;
    if (this.#internals?.states) {
      // The double dash is required in browsers with the
      // legacy syntax, not supplying it will throw.
      // @see https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet#comptability_with_dashed-ident_syntax
      try {
        this.#internals.states.clear();
        this.#internals.states.add(value);
      } catch (error) {
        // this.#internals.states.add(`--${value}`);
        this.setAttribute('status', value);
      }
    } else {
      this.setAttribute('status', value);
    }
    if (value === status.MOUNTED) {
      this.removeAttribute('recovering');
    }
    try {
      const name = this.localName;
      const markNameSpace = `${name}:statusChange`;
      const detail: PerformanceMarkDetail = {
        name: this.#name,
        import: this.import,
      };
      performance.mark(`${markNameSpace}:${value}`, {
        detail,
      });
      switch (value) {
        case status.LOADED:
          performance.measure(`${name}:load`, {
            start: `${markNameSpace}:${status.LOADING}`,
            end: `${markNameSpace}:${status.LOADED}`,
            detail,
          });
          break;
        case status.MOUNTED:
          performance.measure(`${name}:mount`, {
            start: `${markNameSpace}:${status.MOUNTING}`,
            end: `${markNameSpace}:${status.MOUNTED}`,
            detail,
          });
          break;
      }
    } catch (e) {}
    this.dispatchEvent(new Event('statuschange'));
  }

  get #name() {
    return (
      this.id || this.getAttribute('name') || this.import || this.localName
    );
  }

  #throwGlobalError(error: Error) {
    const moduleName = this.#name;
    const prefix = `Web Widget module (${moduleName})`;

    if (typeof error !== 'object') {
      error = new Error(error, { cause: error });
    }

    if (!error.message.includes(prefix)) {
      error.message = `${prefix}: ${error.message}`;
    }

    reportError(error);
  }

  static get observedAttributes() {
    return [
      'data', // @deprecated
      'contextdata',
      'inactive',
      'loading',
      'import',
      'meta', // @deprecated
      'contextmeta',
    ];
  }

  static get timeouts() {
    return globalTimeouts;
  }

  static set timeouts(value) {
    globalTimeouts = value;
  }

  static INITIAL: typeof status.INITIAL;
  static LOADING: typeof status.LOADING;
  static LOADED: typeof status.LOADED;
  static BOOTSTRAPPING: typeof status.BOOTSTRAPPING;
  static BOOTSTRAPPED: typeof status.BOOTSTRAPPED;
  static MOUNTING: typeof status.MOUNTING;
  static MOUNTED: typeof status.MOUNTED;
  static UPDATING: typeof status.UPDATING;
  static UNMOUNTING: typeof status.UNMOUNTING;
  static UNLOADING: typeof status.UNLOADING;
  static LOAD_ERROR: typeof status.LOAD_ERROR;
  static BOOTSTRAP_ERROR: typeof status.BOOTSTRAP_ERROR;
  static MOUNT_ERROR: typeof status.MOUNT_ERROR;
  static UPDATE_ERROR: typeof status.UPDATE_ERROR;
  static UNMOUNT_ERROR: typeof status.UNMOUNT_ERROR;
  static UNLOAD_ERROR: typeof status.UNLOAD_ERROR;
}

Object.assign(HTMLWebWidgetElement, Object.freeze(status));
Object.assign(window, {
  HTMLWebWidgetElement,
});

mountLifecycleCacheLayer(() => {
  queueMicrotask(() => {
    customElements.define('web-widget', HTMLWebWidgetElement);
  });
});

declare global {
  interface Window {
    HTMLWebWidgetElement: typeof HTMLWebWidgetElement;
  }
  interface WebWidgetAttributes extends HTMLWebWidgetElement {
    contextdata: string;
    contextmeta: string;
  }
  interface HTMLElementTagNameMap {
    'web-widget': HTMLWebWidgetElement;
  }
  namespace JSX {
    interface IntrinsicElements {
      'web-widget': WebWidgetAttributes;
    }
  }
}
