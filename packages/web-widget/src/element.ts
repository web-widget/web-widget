import type { ClientWidgetModule } from '@web-widget/helpers';
import { callSyncCacheProvider } from '@web-widget/lifecycle-cache/client';
import type { SerializableObject } from '@web-widget/schema';
import { createIdleObserver } from './utils/idle';
import { createVisibleObserver } from './utils/lazy';
import { triggerModulePreload } from './utils/module-preload';
import { queueMicrotask } from './utils/queue-microtask';
import { reportError } from './utils/report-error';
import type { Lifecycle, ModuleLoader, Status, Timeouts } from './container';
import { ModuleContainer, status } from './container';
import { prepareShadowBoundary } from './boundary';
import { resolveWebWidgetId } from './id';
import { WebWidgetError } from './error';
import { WEB_WIDGET_PENDING_LOCAL_NAME } from './types';
import {
  dispatchHydrationError,
  type HydrationErrorPhase,
} from './hydration-error';
import type { ResolvedWidgetStyle } from './style-descriptors';
import { resolveWidgetStyles } from './style-descriptors';
import { installWidgetStyles } from './styles';

export * from './hydration-error';

let globalTimeouts: Timeouts = Object.create(null);

type Loading = 'eager' | 'lazy' | 'idle';
type Root = 'light' | 'shadow';

const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'innerHTML'
)!;
const innerHTMLSetter = innerHTMLDescriptor.set!;

export interface PerformanceMarkDetail {
  name: string;
  import: string;
  source: string;
  timestamp: number;
}

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

  #widgetStyles: ResolvedWidgetStyle[] = [];

  #isFirstConnect = false;

  #timeouts: Timeouts | null = null;

  #status: Status = status.INITIAL;

  #internals?: ElementInternals;

  #autoMountPromise: Promise<void> | null = null;

  // Performance data fields
  performance?: {
    loadTime?: string;
    mountTime?: string;
  };

  constructor() {
    super();

    if (this.attachInternals) {
      this.#internals = this.attachInternals();
    }
  }

  #autoMount() {
    // Prevent duplicate execution
    if (this.#autoMountPromise) return;

    // Check prerequisites for auto-mounting:
    // - Element must be connected to DOM
    // - Element must not be inactive
    // - Must have either import URL or loader function
    if (!this.isConnected || this.inactive || !(this.import || this.loader)) {
      return;
    }

    // Only auto-mount from initial state or load error state
    const canAutoMount =
      this.status === status.INITIAL || this.status === status.LOAD_ERROR;

    if (!canAutoMount) {
      return;
    }

    this.#autoMountPromise = Promise.resolve().then(async () => {
      try {
        await this.load();
        await this.bootstrap();
        await this.mount();
      } catch (error) {
        this.#throwGlobalError(error);
      } finally {
        this.#autoMountPromise = null;
      }
    });
  }

  /**
   * WidgetModule loader.
   * @default null
   */
  get loader() {
    return this.#loader || null;
  }

  set loader(value: ModuleLoader | null) {
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
          this.#throwGlobalError(error);
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
  get loading(): Loading {
    return (this.getAttribute('loading') as Loading | null) || 'eager';
  }

  set loading(value: Loading) {
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
    const bareImportRE = /^(?![a-z]:)[\w@](?!.*:\/\/)/i;
    if (value && !bareImportRE.test(value)) {
      value = new URL(value, this.base).href;
    }
    return value === null ? '' : value;
  }

  set import(value) {
    this.setAttribute('import', value);
  }

  /**
   * WidgetModule root mode.
   * @default "light"
   */
  get root(): Root {
    return (this.getAttribute('root') as Root | null) || 'light';
  }

  set root(value: Root) {
    this.setAttribute('root', value);
  }

  /** Vite CSS module ids transferred by the dev renderer. */
  get devStyleIds(): string[] {
    const value = this.getAttribute('devstyles');
    if (!value) return [];
    try {
      const ids = JSON.parse(value);
      return Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
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
    if (this.root === 'shadow') {
      const boundary = prepareShadowBoundary(this, this.recovering);
      container = boundary.container;
      const styles = [...this.#widgetStyles];
      for (const id of this.devStyleIds) {
        if (!styles.some((style) => style.id === id)) {
          // The attribute transfers only the style identity. Keep any SSR
          // content until Vite's client-side style source is adopted.
          styles.push({ id });
        }
      }
      installWidgetStyles(boundary.root, styles, container);
    } else if (this.root === 'light') {
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
    if (!this.#isFirstConnect) {
      const preload = () => this.import && triggerModulePreload(this.import);
      const options: AddEventListenerOptions = { once: true, passive: true };
      ['mousemove', 'touchstart'].forEach((type) =>
        this.addEventListener(type, preload, options)
      );
      this.#isFirstConnect = true;
    }
    this.#connectedCallback();
  }

  #connectedCallback() {
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
    const cacheClearingAttributes = ['contextdata', 'data'];
    if (cacheClearingAttributes.includes(name)) {
      this.#data = null;
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

  async #call(lifecycle: Lifecycle, data?: SerializableObject) {
    if (!this.#moduleContainer) {
      this.#moduleContainer = this.#createModuleContainer();
    }
    try {
      return await this.#moduleContainer[lifecycle](data);
    } catch (error) {
      if (this.recovering && this.#isHydrationLifecycle(lifecycle)) {
        dispatchHydrationError(this, {
          moduleURL: this.import,
          adapter: this.getAttribute('adapter') || 'unknown',
          phase: this.#hydrationErrorPhase(lifecycle),
          error,
        });
      }
      throw error;
    }
  }

  #isHydrationLifecycle(lifecycle: Lifecycle) {
    return (
      lifecycle === 'load' || lifecycle === 'bootstrap' || lifecycle === 'mount'
    );
  }

  #hydrationErrorPhase(lifecycle: Lifecycle): HydrationErrorPhase {
    if (lifecycle === 'load') return 'module-import';
    if (lifecycle === 'bootstrap') return 'adapter-bootstrap';
    return 'boundary-recovery';
  }

  #createModuleContainer() {
    const view = this;
    view.id = resolveWebWidgetId(view.hasAttribute('id') ? view.id : undefined);
    let container: Element | DocumentFragment;
    const { recovering, contextData } = this;
    const moduleContainer = new ModuleContainer<unknown>(
      () => {
        if (!this.loader) {
          this.loader = this.createLoader();
        }
        return this.loader().then((module) => {
          const clientModule = module as ClientWidgetModule;
          this.#widgetStyles = resolveWidgetStyles(
            clientModule.meta,
            this.import || this.base
          );
          return clientModule;
        });
      },
      contextData,
      {
        get container() {
          if (!container) {
            container = view.createContainer();
          }
          return container;
        },
        get id() {
          return view.id;
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
    if (value === status.MOUNTING) {
      this.#clearPending();
    }
    this.#updateStatus(value);
    this.#markPerformance(value);
    this.#dispatchStatusChangeEvent();
  }

  #clearPending() {
    for (const child of Array.from(this.children)) {
      if (child.localName === WEB_WIDGET_PENDING_LOCAL_NAME) {
        child.remove();
      }
    }
  }

  #updateStatus(value: Status) {
    this.#status = value;
    if (this.#internals?.states) {
      // The double dash is required in browsers with the
      // legacy syntax, not supplying it will throw.
      // @see https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet#comptability_with_dashed-ident_syntax
      try {
        this.#internals.states.clear();
        this.#internals.states.add(value);
      } catch {
        this.setAttribute('status', value);
      }
    } else {
      this.setAttribute('status', value);
    }
    if (value === status.MOUNTED) {
      this.removeAttribute('recovering');
    }
  }

  #markPerformance(value: Status) {
    try {
      const componentName = this.#name;
      const markNameSpace = `${componentName}:statusChange`;
      const detail: PerformanceMarkDetail = {
        name: componentName,
        import: this.import,
        source: this.localName,
        timestamp: Date.now(),
      };

      performance.mark(`${markNameSpace}:${value}`, { detail });

      switch (value) {
        case status.LOADED: {
          const loadMeasure = performance.measure(`${componentName}:load`, {
            start: `${markNameSpace}:${status.LOADING}`,
            end: `${markNameSpace}:${status.LOADED}`,
            detail,
          });
          // Store load time in performance object
          if (!this.performance) {
            this.performance = {};
          }
          this.performance.loadTime = `${Math.round(loadMeasure.duration)}ms`;
          break;
        }
        case status.MOUNTED: {
          const mountMeasure = performance.measure(`${componentName}:mount`, {
            start: `${markNameSpace}:${status.MOUNTING}`,
            end: `${markNameSpace}:${status.MOUNTED}`,
            detail,
          });
          // Store mount time in performance object
          if (!this.performance) {
            this.performance = {};
          }
          this.performance.mountTime = `${Math.round(mountMeasure.duration)}ms`;
          break;
        }
      }
    } catch {}
  }

  #dispatchStatusChangeEvent() {
    this.dispatchEvent(new Event('statuschange'));
  }

  get #name() {
    const attr = this.id
      ? ['id', this.id]
      : this.getAttribute('name')
        ? ['name', this.getAttribute('name')]
        : this.import
          ? ['import', this.import]
          : null;

    return attr
      ? `${this.localName}[${attr[0]}=${JSON.stringify(attr[1])}]`
      : this.localName;
  }

  #throwGlobalError(error: unknown) {
    const moduleName = this.#name;
    let err: Error;
    if (error instanceof WebWidgetError) {
      err = error;
    } else if (error instanceof Error) {
      err = new WebWidgetError(moduleName, error.message, error);
    } else if (typeof error === 'string') {
      err = new WebWidgetError(moduleName, error);
    } else {
      err = new WebWidgetError(moduleName, 'Unknown error', error);
    }
    reportError(err);
  }

  static get observedAttributes() {
    return [
      'data', // @deprecated
      'contextdata',
      'inactive',
      'loading',
      'import',
      'meta', // @deprecated
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

Object.assign(HTMLWebWidgetElement, status);

export interface HTMLWebWidgetElementAttributes extends Partial<HTMLWebWidgetElement> {
  contextdata?: string;
  inactive?: boolean;
  recovering?: boolean;
  loading?: Loading;
  import?: string;
  root?: Root;
  base?: string;
  timeouts?: Timeouts;
}

declare global {
  let importShim: <T>(src: string) => Promise<T>;
}
