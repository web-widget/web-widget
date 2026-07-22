import type { ClientWidgetModule } from '@web-widget/helpers';
import { callSyncCacheProvider } from '@web-widget/lifecycle-cache/client';
import type { SerializableObject } from '@web-widget/schema';
import { type Loading, WidgetLoadingController } from '../loading/controller';
import { queueMicrotask } from '../platform/queue-microtask';
import type {
  Lifecycle,
  ModuleLoader,
  Status,
  Timeouts,
} from '../lifecycle/runtime';
import { WidgetRuntime, status } from '../lifecycle/runtime';
import { prepareShadowBoundary } from '../shadow/boundary';
import { resolveWebWidgetId } from '../shared/id';
import { reportWebWidgetError } from './error';
import {
  INNER_HTML_PLACEHOLDER,
  WEB_WIDGET_PENDING_SLOT_NAME,
  WEB_WIDGET_RECOVERING_CHANGE_EVENT,
} from '../shared/constants';
import {
  dispatchHydrationError,
  type HydrationErrorPhase,
} from './hydration-error';
import type { ResolvedWidgetStyle } from '../shadow/style-descriptors';
import { resolveWidgetStyles } from '../shadow/style-descriptors';
import { installWidgetStyles } from '../shadow/styles';
import { markWidgetPerformance, type WidgetPerformance } from './performance';

export * from './hydration-error';
export type { PerformanceMarkDetail } from './performance';

let globalTimeouts: Timeouts = Object.create(null);

type Root = 'light' | 'shadow';
type LifecycleTarget = typeof status.INITIAL | typeof status.MOUNTED;
type ReconciledLifecycle =
  'load' | 'bootstrap' | 'mount' | 'unmount' | 'unload';

const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'innerHTML'
)!;
const innerHTMLGetter = innerHTMLDescriptor.get!;
const innerHTMLSetter = innerHTMLDescriptor.set!;

export { INNER_HTML_PLACEHOLDER } from '../shared/constants';

/**
 * Web Widget Container
 * @event {Event} statuschange
 */
export class HTMLWebWidgetElement extends HTMLElement {
  #loader: ModuleLoader | null = null;

  #runtime: WidgetRuntime | null = null;

  #data: SerializableObject | null = null;

  #widgetStyles: ResolvedWidgetStyle[] = [];

  #timeouts: Timeouts | null = null;

  #status: Status = status.INITIAL;

  #internals?: ElementInternals;

  #loadingController = new WidgetLoadingController(
    this,
    () => this.#requestLifecycle(status.MOUNTED),
    (error) => this.#throwGlobalError(error)
  );

  #lifecycleTarget: LifecycleTarget = status.INITIAL;

  #lifecycleTask: Promise<void> | null = null;

  // Performance data fields
  performance?: WidgetPerformance;

  constructor() {
    super();

    if (this.attachInternals) {
      this.#internals = this.attachInternals();
    }
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
      this.#loadingController.sourceChanged();
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
   * @default "auto"
   */
  get loading(): Loading {
    const value = this.getAttribute('loading');
    return value === 'eager' || value === 'lazy' || value === 'idle'
      ? value
      : 'auto';
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

  // Parent frameworks treat a recovering Widget as an opaque SSR boundary.
  get innerHTML() {
    return this.recovering
      ? INNER_HTML_PLACEHOLDER
      : innerHTMLGetter.call(this);
  }

  set innerHTML(value: string) {
    if (String(value) === INNER_HTML_PLACEHOLDER) {
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
    this.#loadingController.connect();
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
    if (name === 'recovering') {
      this.dispatchEvent(new Event(WEB_WIDGET_RECOVERING_CHANGE_EVENT));
      return;
    }
    if (name === 'loading' && this.isConnected) {
      this.#loadingController.loadingChanged();
      return;
    }
    if (name === 'inactive') {
      this.#loadingController.inactiveChanged();
      return;
    }
    const cacheClearingAttributes = ['contextdata', 'data'];
    if (cacheClearingAttributes.includes(name)) {
      this.#data = null;
    }
    if (this.loading === 'eager' || name === 'import') {
      this.#loadingController.sourceChanged();
    }
  }

  destroyedCallback() {
    this.#loadingController.disconnect();
    if (this.inactive) return;

    this.#requestLifecycle(status.INITIAL).catch((error) =>
      this.#throwGlobalError(error)
    );
  }

  #requestLifecycle(target: LifecycleTarget) {
    this.#lifecycleTarget = target;
    const task = this.#lifecycleTask
      ? this.#lifecycleTask.then(() => this.#reconcileLifecycle())
      : this.#reconcileLifecycle();
    const settledTask = task.catch(() => {});
    this.#lifecycleTask = settledTask;
    void settledTask.then(() => {
      if (this.#lifecycleTask === settledTask) this.#lifecycleTask = null;
    });
    return task;
  }

  async #reconcileLifecycle() {
    let lifecycle: ReconciledLifecycle | undefined;
    while ((lifecycle = this.#nextLifecycle())) {
      await this[lifecycle]();
    }
  }

  #nextLifecycle(): ReconciledLifecycle | undefined {
    if (this.#lifecycleTarget === status.MOUNTED) {
      if (this.status === status.INITIAL || this.status === status.LOAD_ERROR) {
        return 'load';
      }
      if (this.status === status.LOADED) return 'bootstrap';
      if (this.status === status.BOOTSTRAPPED) return 'mount';
      return;
    }

    if (this.status === status.MOUNTED) return 'unmount';
    if (this.status === status.LOADED || this.status === status.BOOTSTRAPPED) {
      return 'unload';
    }
    return;
  }

  async #call(lifecycle: Lifecycle, data?: SerializableObject) {
    if (!this.#runtime) {
      this.#runtime = this.#createRuntime();
    }
    try {
      return await this.#runtime[lifecycle](data);
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

  #createRuntime() {
    const view = this;
    view.id = resolveWebWidgetId(view.hasAttribute('id') ? view.id : undefined);
    let container: Element | DocumentFragment;
    const { recovering, contextData } = this;
    const runtime = new WidgetRuntime<unknown>(
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
    runtime.timeouts = this.#timeouts;
    runtime.onStatusChange = (status) => {
      this.#statusChangeCallback(status);
    };
    return runtime;
  }

  #statusChangeCallback(value: Status) {
    if (value === status.MOUNTING) {
      this.#clearPending();
    }
    this.#updateStatus(value);
    markWidgetPerformance(this, value, this.#name);
    this.#dispatchStatusChangeEvent();
  }

  #clearPending() {
    // The reserved slot is also the lifecycle marker in both root modes.
    for (const child of Array.from(this.children)) {
      if (child.getAttribute('slot') === WEB_WIDGET_PENDING_SLOT_NAME) {
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
    reportWebWidgetError(this.#name, error);
  }

  static get observedAttributes() {
    return [
      'data', // @deprecated
      'contextdata',
      'inactive',
      'loading',
      'import',
      'meta', // @deprecated
      'recovering',
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
