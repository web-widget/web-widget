import type {
  ClientWidgetModule,
  ClientWidgetRenderContext,
  Meta,
} from '@web-widget/helpers';
import { mountLifecycleCacheLayer } from '@web-widget/lifecycle-cache/client';
import { WebWidgetUpdateEvent } from './event';
import { LifecycleController } from './modules/controller';
import { status } from './modules/status';
import type { JSONProps } from './types';
import { createIdleObserver } from './utils/idle';
import { createVisibleObserver } from './utils/lazy';
import { triggerModulePreload } from './utils/module-preload';
import { queueMicrotask } from './utils/queue-microtask';

declare const importShim: <T>(src: string) => Promise<T>;
type Timeouts = Record<string, number>;
let globalTimeouts: Timeouts = Object.create(null);

/**
 * Web Widget Container
 * @event {Event} statuschange
 * @event {WebWidgetUpdateEvent} update
 */
export class HTMLWebWidgetElement extends HTMLElement {
  #loader: (() => Promise<ClientWidgetModule>) | null = null;

  #lifecycleController: LifecycleController;

  #data: JSONProps | null = null;

  #disconnectObserver?: () => void;

  #meta: Meta | null = null;

  #context: ClientWidgetRenderContext | Record<string, unknown> | null = null;

  #isFirstConnect = false;

  #timeouts: Timeouts | null = null;

  #status: string = status.INITIAL;

  constructor() {
    super();

    this.#lifecycleController = new LifecycleController(
      () => {
        if (!this.loader) {
          this.loader = this.createLoader();
        }
        return this.loader();
      },
      {
        handler: () => {
          if (!this.context) {
            this.context = this.createContext();
          }
          return {
            importer: this.import,
            context: this.context as ClientWidgetRenderContext,
          };
        },
        statusChangeCallback: (status) => {
          this.#statusChangeCallback(status);
        },
        timeouts: this.timeouts || {},
      }
    );
  }

  #autoMount() {
    if (
      this.status === status.INITIAL &&
      !this.inactive &&
      this.isConnected &&
      (this.import || this.loader)
    ) {
      queueMicrotask(() =>
        this.mount().catch(this.#throwGlobalError.bind(this))
      );
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
   */
  get data(): JSONProps | null {
    if (!this.#data) {
      const dataAttr = this.getAttribute('data');

      if (dataAttr) {
        try {
          this.#data = JSON.parse(dataAttr);
        } catch (error) {
          this.#throwGlobalError(error as TypeError);
          this.#data = {};
        }
      } else if (Object.entries(this.dataset).length) {
        this.#data = { ...(this.dataset as JSONProps) };
      }
    }

    return this.#data;
  }

  set data(value: JSONProps) {
    if (typeof value === 'object') {
      this.setAttribute('data', JSON.stringify(value));
    }
  }

  /**
   * WidgetModule meta.
   */
  get meta(): Meta | null {
    if (!this.#meta) {
      const dataAttr = this.getAttribute('meta');

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

  set meta(value: Meta) {
    if (typeof value === 'object') {
      this.setAttribute('meta', JSON.stringify(value));
    }
  }

  /**
   * WidgetModule context.
   */
  get context(): ClientWidgetRenderContext | Record<string, unknown> | null {
    return this.#context;
  }

  set context(value: ClientWidgetRenderContext | Record<string, unknown>) {
    if (typeof value === 'object' && value !== null) {
      this.#context = value;
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
  get loading(): string {
    return this.getAttribute('loading') || 'eager';
  }

  set loading(value: 'eager' | 'lazy' | 'idle') {
    this.setAttribute('loading', value);
  }

  /**
   * WidgetModule container status.
   * @default "initial"
   */
  get status(): string {
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

  /**
   * Hook: Create the module's context.
   */
  createContext(): ClientWidgetRenderContext {
    let container: Element | DocumentFragment;
    let customContext = this.context;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const view = this;

    if (!customContext) {
      const context = this.getAttribute('context');

      if (context) {
        try {
          customContext = JSON.parse(context);
        } catch (error) {
          this.#throwGlobalError(error as TypeError);
        }
      }
    }

    const context = Object.create({
      get container() {
        if (!container) {
          container = view.createContainer();
        }
        return container;
      },

      data: view.data ?? {},
      meta: view.meta ?? {},
      recovering: view.recovering,
      /**@deprecated*/
      update: this.update.bind(this),
    });

    return Object.assign(context, customContext || {});
  }

  /**
   * Hook: Create the module's render node.
   */
  createContainer(): Element | DocumentFragment {
    let container: Element | DocumentFragment | null = null;

    if (this.renderTarget === 'shadow') {
      if (this.recovering) {
        if (this.attachInternals) {
          const internals = this.attachInternals();
          if (internals.shadowRoot) {
            container = internals.shadowRoot;
          }
        }
      }

      if (!container) {
        container = this.attachShadow({ mode: 'open' });
      }
    } else if (this.renderTarget === 'light') {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      container = this;
    }

    if (container && !Reflect.has(container, 'update')) {
      // support v0
      ['mount', 'update', 'unmount'].forEach((name) => {
        // @ts-ignore
        if (!container[name]) {
          Reflect.defineProperty(container as Node, name, {
            // @ts-ignore
            value: (context) => this[name](context),
          });
        }
      });
    }

    return container as Element | DocumentFragment;
  }

  /**
   * Hook: Create Create the module's loader.
   */
  createLoader(): () => Promise<ClientWidgetModule> {
    // @see https://github.com/WICG/import-maps#feature-detection
    const supportsImportMaps =
      HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');

    function importModule(target: string) {
      if (!supportsImportMaps && typeof importShim === 'function') {
        // @see https://github.com/guybedford/es-module-shims
        // eslint-disable-next-line no-undef
        return importShim<ClientWidgetModule>(target);
      }
      return import(
        /* @vite-ignore */ /* webpackIgnore: true */ target
      ) as Promise<ClientWidgetModule>;
    }

    return () => importModule(this.import);
  }

  /**
   * Trigger the loading of the module.
   */
  async load(): Promise<void> {
    await this.#trigger('load');
  }

  /**
   * Trigger the bootstrapping of the module.
   */
  async bootstrap(): Promise<void> {
    await this.#trigger('bootstrap');
  }

  /**
   * Trigger the mounting of the module.
   */
  async mount(): Promise<void> {
    await this.#trigger('mount');
  }

  /**
   * Trigger the updating of the module.
   */
  async update(context: object = {}): Promise<void> {
    if (
      this.context &&
      this.dispatchEvent(
        new WebWidgetUpdateEvent('update', {
          value: context,
          cancelable: true,
        })
      )
    ) {
      Object.assign(this.context, context);
      await this.#trigger('update');
    } else {
      throw new Error(`Can't update`);
    }
  }

  /**
   * Trigger the unmounting of the module.
   */
  async unmount(): Promise<void> {
    await this.#trigger('unmount');
  }

  /**
   * Trigger the unloading of the module.
   */
  async unload(): Promise<void> {
    const context = this.context || {};
    await this.#trigger('unload');
    Object.getOwnPropertyNames(context).forEach((key) => {
      Reflect.deleteProperty(context, key);
    });
  }

  connectedCallback() {
    // connected
    if (!this.#isFirstConnect) {
      this.#firstConnectedCallback();
      this.#isFirstConnect = true;
    }
  }

  #firstConnectedCallback() {
    const options: AddEventListenerOptions = {
      once: true,
      passive: true,
    };
    const preload = () => {
      if (this.import) {
        triggerModulePreload(this.import);
      }
    };
    ['mousemove', 'touchstart'].forEach((type) =>
      this.addEventListener(type, preload, options)
    );

    if (this.loading === 'eager') {
      this.#autoMount();
    } else if (this.loading === 'lazy') {
      this.#disconnectObserver = createVisibleObserver(this, () =>
        this.#autoMount()
      );
    } else if (this.loading === 'idle') {
      this.#disconnectObserver = createIdleObserver(this, () =>
        this.#autoMount()
      );
    }
  }

  disconnectedCallback() {
    // disconnected
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.destroyedCallback();
      }
    });
  }

  attributeChangedCallback(name: string) {
    if (name === 'data') {
      // NOTE: Clear cache
      this.#data = null;
    }
    if (name === 'meta') {
      // NOTE: Clear cache
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
      this.unload().catch(this.#throwGlobalError.bind(this));
    }
  }

  #trigger(name: string) {
    return this.#lifecycleController.run(name);
  }

  #statusChangeCallback(value: string) {
    this.#status = value;
    this.setAttribute('status', value);

    if (value === status.MOUNTED) {
      this.removeAttribute('recovering');
    }

    this.dispatchEvent(new Event('statuschange'));
  }

  #throwGlobalError(error: Error) {
    const moduleName =
      this.id || this.getAttribute('name') || this.import || this.localName;
    const prefix = `Web Widget module (${moduleName})`;
    if (typeof error !== 'object') {
      error = new Error(error);
    }

    if (!error.message.includes(prefix)) {
      Reflect.defineProperty(error, 'message', {
        value: `${prefix}: ${error.message}`,
        writable: true,
        configurable: true,
      });
    }

    queueMicrotask(() => {
      throw error;
    });
  }

  static get observedAttributes() {
    return ['data', 'inactive', 'loading', 'import', 'meta'];
  }

  static get timeouts() {
    return globalTimeouts;
  }

  static set timeouts(value) {
    globalTimeouts = value;
  }

  static INITIAL: string;
  static LOADING: string;
  static LOADED: string;
  static BOOTSTRAPPING: string;
  static BOOTSTRAPPED: string;
  static MOUNTING: string;
  static MOUNTED: string;
  static UPDATING: string;
  static UNMOUNTING: string;
  static UNLOADING: string;
  static LOAD_ERROR: string;
  static BOOTSTRAP_ERROR: string;
  static MOUNT_ERROR: string;
  static UPDATE_ERROR: string;
  static UNMOUNT_ERROR: string;
  static UNLOAD_ERROR: string;
}

Object.assign(HTMLWebWidgetElement, status);
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
  interface HTMLElementTagNameMap {
    'web-widget': HTMLWebWidgetElement;
  }
}
