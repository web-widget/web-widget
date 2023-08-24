import * as status from "./modules/status";

import type {
  WidgetModuleLoader,
  WidgetRenderContext,
} from "./modules/types";
import { observe, unobserve } from "./utils/visible-observer";

import { LifecycleController } from "./modules/controller";
import { WebWidgetUpdateEvent } from "./event";
import { queueMicrotask } from "./utils/queue-microtask";

declare const importShim: (src: string) => Promise<any>;
let globalTimeouts = Object.create(null);

/**
 * Web Widget Container
 * @event {Event} statuschange
 * @event {WebWidgetUpdateEvent} update
 */
export class HTMLWebWidgetElement extends HTMLElement {
  // @ts-ignore
  #loader: WidgetModuleLoader | null;

  #lifecycleController: LifecycleController;

  // @ts-ignore
  #data: Record<string, unknown> | null;

  // @ts-ignore
  #context: WidgetRenderContext | Record<string, unknown>;

  #isFirstConnect = false;

  #timeouts = null;

  #status: string = status.INITIAL;

  constructor() {
    super();

    this.#lifecycleController = new LifecycleController({
      contextLoader: () => {
        if (!this.context) {
          this.context = this.createContext();
        }
        return this.context as WidgetRenderContext;
      },
      moduleLoader: () => {
        if (!this.loader) {
          this.loader = this.createLoader();
        }
        return this.loader();
      },
      statusChangeCallback: (status) => {
        this.#statusChangeCallback(status);
      },
      timeouts: this.timeouts || {},
    });
  }

  #autoMount() {
    if (
      this.status === status.INITIAL &&
      !this.inactive &&
      this.isConnected &&
      (this.import || this.src || this.loader)
    ) {
      queueMicrotask(() =>
        this.mount().catch(this.#throwGlobalError.bind(this))
      );
    }
  }

  get loader() {
    return this.#loader || null;
  }

  set loader(value) {
    if (typeof value === "function") {
      this.#loader = value;
      if (this.loading !== "lazy") {
        this.#autoMount();
      }
    }
  }

  /**
   * WidgetModule base
   */
  get base() {
    const value = this.getAttribute("base");
    return value === null ? this.baseURI : new URL(value, this.baseURI).href;
  }

  set base(value) {
    this.setAttribute("base", value);
  }

  /**
   * WidgetModule data
   */
  get data(): Record<string, unknown> | null {
    if (!this.#data) {
      const dataAttr = this.getAttribute("data");

      if (dataAttr) {
        try {
          this.#data = JSON.parse(dataAttr);
        } catch (error) {
          this.#throwGlobalError(error as TypeError);
          this.#data = null;
        }
      } else if (Object.entries(this.dataset).length) {
        this.#data = { ...this.dataset };
      }
    }

    return this.#data;
  }

  set data(value: Record<string, unknown> | null) {
    if (typeof value === "object") {
      this.#data = value;
    }
  }

  /**
   * WidgetModule context
   */
  get context(): WidgetRenderContext | Record<string, unknown> {
    return this.#context;
  }

  set context(value: WidgetRenderContext | Record<string, unknown>) {
    if (typeof value === "object" && value !== null) {
      this.#context = value;
    }
  }

  /**
   * Whether the module is inactive
   */
  get inactive(): boolean {
    return this.hasAttribute("inactive");
  }

  set inactive(value: boolean) {
    if (value) {
      this.setAttribute("inactive", "");
    } else {
      this.removeAttribute("inactive");
    }
  }

  get recovering(): boolean {
    return this.hasAttribute("recovering");
  }

  set recovering(value: boolean) {
    if (value) {
      this.setAttribute("recovering", "");
    } else {
      this.removeAttribute("recovering");
    }
  }

  /**
   * Indicates how the browser should load the module
   */
  get loading(): string {
    return this.getAttribute("loading") || "auto";
  }

  set loading(value) {
    this.setAttribute("loading", value);
  }

  /**
   * WidgetModule status
   */
  get status(): string {
    return this.#status;
  }

  /**
   * WidgetModule URL
   */
  get src() {
    const value = this.getAttribute("src");
    return value === null ? "" : new URL(value, this.baseURI).href;
  }

  set src(value) {
    this.setAttribute("src", value);
  }

  /**
   * WidgetModule bare module name
   */
  get import() {
    let value = this.getAttribute("import");
    const relativePath = /^\.\.?\//;
    if (value && relativePath.test(value)) {
      value = new URL(value, this.base).href;
    }
    return value === null ? "" : value;
  }

  set import(value) {
    this.setAttribute("import", value);
  }

  /**
   * WidgetModule render target
   */
  get renderTarget(): "light" | "shadow" {
    return (this.getAttribute("rendertarget") as "light") || "shadow";
  }

  set renderTarget(value: "light" | "shadow") {
    this.setAttribute("rendertarget", value);
  }

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
   * Hook: Create the module's context
   */
  createContext(): WidgetRenderContext {
    let container: HTMLElement | ShadowRoot;
    let customContext = this.context;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const view = this;

    if (!customContext) {
      const context = this.getAttribute("context");

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

      get recovering() {
        return view.recovering;
      },

      get data() {
        return view.data;
      },

      update: this.update.bind(this),
    });

    return Object.assign(context, customContext || {});
  }

  /**
   * Hook: Create the module's render node
   */
  createContainer(): HTMLElement | ShadowRoot {
    let container: HTMLElement | ShadowRoot | null = null;

    if (this.renderTarget === "shadow") {
      if (this.recovering) {
        if (this.attachInternals) {
          const internals = this.attachInternals();
          if (internals.shadowRoot) {
            container = internals.shadowRoot;
          }
        }
      }

      if (!container) {
        container = this.attachShadow({ mode: "open" });
      }
    } else if (this.renderTarget === "light") {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      container = this;
    }

    if (container && !Reflect.has(container, "update")) {
      // support v0
      ["mount", "update", "unmount"].forEach((name) => {
        // @ts-ignore
        if (!container[name]) {
          Reflect.defineProperty(container as Node, name, {
            // @ts-ignore
            value: (context) => this[name](context),
          });
        }
      });
    }

    return container as HTMLElement | ShadowRoot;
  }

  /**
   * Hook: Create Create the module's loader
   */
  createLoader(): WidgetModuleLoader {
    // @see https://github.com/WICG/import-maps#feature-detection
    const supportsImportMaps =
      HTMLScriptElement.supports && HTMLScriptElement.supports("importmap");

    function importModule(target: string) {
      if (!supportsImportMaps && typeof importShim === "function") {
        // @see https://github.com/guybedford/es-module-shims
        // eslint-disable-next-line no-undef
        return importShim(target);
      }
      return import(/* @vite-ignore */ /* webpackIgnore: true */ target);
    }

    const nameOrPath = this.import || this.src;
    return () => importModule(nameOrPath);
  }

  /**
   * Trigger the loading of the module
   */
  async load(): Promise<void> {
    await this.#trigger("load");
  }

  /**
   * Trigger the bootstrapping of the module
   */
  async bootstrap(): Promise<void> {
    await this.#trigger("bootstrap");
  }

  /**
   * Trigger the mounting of the module
   */
  async mount(): Promise<void> {
    await this.#trigger("mount");
  }

  /**
   * Trigger the updating of the module
   */
  async update(context: object = {}): Promise<void> {
    if (
      this.context &&
      this.dispatchEvent(
        new WebWidgetUpdateEvent("update", {
          value: context,
          cancelable: true,
        })
      )
    ) {
      Object.assign(this.context, context);
      await this.#trigger("update");
    } else {
      throw new Error(`Can't update`);
    }
  }

  /**
   * Trigger the unmounting of the module
   */
  async unmount(): Promise<void> {
    await this.#trigger("unmount");
  }

  /**
   * Trigger the unloading of the module
   */
  async unload(): Promise<void> {
    const context = this.context || {};
    await this.#trigger("unload");
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
    if (this.loading === "lazy") {
      observe(this, () => this.#autoMount());
    } else {
      this.#autoMount();
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
    if (name === "data") {
      this.data = null;
    }
    if (name === "context") {
      // this.context = null;
    }
    if (this.loading !== "lazy") {
      this.#autoMount();
    }
  }

  destroyedCallback() {
    if (this.loading === "lazy") {
      unobserve(this);
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
    this.setAttribute("status", value);

    if (value === status.MOUNTED) {
      this.removeAttribute("recovering");
    }

    this.dispatchEvent(new Event("statuschange"));
  }

  #throwGlobalError(error: Error) {
    const applicationName =
      this.id || this.import || this.src || this.localName;
    const prefix = `Web Widget module (${applicationName})`;
    if (typeof error !== "object") {
      error = new Error(error);
    }

    if (!error.message.includes(prefix)) {
      Reflect.defineProperty(error, "message", {
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
    return ["data", "import", "src", "inactive"];
  }

  static get timeouts() {
    return globalTimeouts;
  }

  static set timeouts(value) {
    globalTimeouts = value;
  }
}

Object.assign(HTMLWebWidgetElement, status);
Object.assign(window, {
  HTMLWebWidgetElement,
});

customElements.define("web-widget", HTMLWebWidgetElement);
