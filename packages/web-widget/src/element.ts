import * as status from "./modules/status";
import type { Loader, WidgetRenderContext, Meta } from "./types";
import { createIdleObserver } from "./utils/idle";
import { createVisibleObserver } from "./utils/lazy";

import { LifecycleController } from "./modules/controller";
import { WebWidgetUpdateEvent } from "./event";
import { queueMicrotask } from "./utils/queue-microtask";
import { triggerModulePreload } from "./utils/module-preload";
import { callContext, useAllState } from "@web-widget/schema/helpers";

declare const importShim: (src: string) => Promise<any>;
let globalTimeouts = Object.create(null);

/**
 * Web Widget Container
 * @event {Event} statuschange
 * @event {WebWidgetUpdateEvent} update
 */
export class HTMLWebWidgetElement extends HTMLElement {
  // @ts-ignore
  #loader: Loader | null;

  #lifecycleController: LifecycleController;

  // @ts-ignore
  #data: WidgetRenderContext["data"] | null;

  #disconnectObserver?: () => void;

  // @ts-ignore
  #meta: Meta | null;

  // @ts-ignore
  #context: WidgetRenderContext | Record<string, unknown>;

  #isFirstConnect = false;

  #timeouts = null;

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
            context: this.context as WidgetRenderContext,
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

  get loader() {
    return this.#loader || null;
  }

  set loader(value) {
    if (typeof value === "function") {
      this.#loader = value;
      if (this.loading === "eager") {
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
  get data(): WidgetRenderContext["data"] {
    if (!this.#data) {
      const dataAttr = this.getAttribute("data");

      if (dataAttr) {
        try {
          this.#data = JSON.parse(dataAttr);
        } catch (error) {
          this.#throwGlobalError(error as TypeError);
          this.#data = {};
        }
      } else if (Object.entries(this.dataset).length) {
        this.#data = { ...this.dataset };
      }
    }

    return this.#data;
  }

  set data(value: WidgetRenderContext["data"]) {
    if (typeof value === "object") {
      this.#data = value;
    }
  }

  /**
   * WidgetModule meta
   */
  get meta(): Meta {
    if (!this.#meta) {
      const dataAttr = this.getAttribute("meta");

      if (dataAttr) {
        try {
          this.#meta = JSON.parse(dataAttr);
        } catch (error) {
          this.#throwGlobalError(error as TypeError);
          this.#meta = {};
        }
      }
    }

    return this.#meta as Meta;
  }

  set meta(value: Meta) {
    if (typeof value === "object") {
      this.#meta = value || {};
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
   * @default "eager"
   */
  get loading(): string {
    return this.getAttribute("loading") || "eager";
  }

  set loading(value: "eager" | "lazy" | "idle") {
    this.setAttribute("loading", value);
  }

  /**
   * WidgetModule status
   */
  get status(): string {
    return this.#status;
  }

  /**
   * WidgetModule module name
   */
  get import() {
    let value = this.getAttribute("import");
    const bareImportRE = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/;
    if (value && !bareImportRE.test(value)) {
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
    let container: Element | DocumentFragment;
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

    const recovering = view.recovering;
    const context = Object.create({
      get container() {
        if (!container) {
          container = view.createContainer();
        }
        return container;
      },

      data: view.data,
      meta: view.meta,
      recovering,
      /**@deprecated*/
      update: this.update.bind(this),
    });

    const stateElement = recovering
      ? (context.container.querySelector(
          "script[name=state\\:web-widget]"
        ) as HTMLScriptElement)
      : null;
    const state =
      recovering && stateElement
        ? JSON.parse(stateElement.textContent as string)
        : {};
    stateElement?.remove();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    Object.assign(useAllState(), state);

    return Object.assign(context, customContext || {});
  }

  /**
   * Hook: Create the module's render node
   */
  createContainer(): Element | DocumentFragment {
    let container: Element | DocumentFragment | null = null;

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

    return container as Element | DocumentFragment;
  }

  /**
   * Hook: Create Create the module's loader
   */
  createLoader(): Loader {
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

    return () => importModule(this.import);
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
    const options: AddEventListenerOptions = {
      once: true,
      passive: true,
    };
    const preload = () => {
      if (this.import) {
        triggerModulePreload(this.import);
      }
    };
    ["mousemove", "touchstart"].forEach((type) =>
      this.addEventListener(type, preload, options)
    );

    if (this.loading === "eager") {
      this.#autoMount();
    } else if (this.loading === "lazy") {
      this.#disconnectObserver = createVisibleObserver(this, () =>
        this.#autoMount()
      );
    } else if (this.loading === "idle") {
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
    if (name === "data") {
      // NOTE: Clear cache
      this.#data = null;
    }
    if (name === "meta") {
      // NOTE: Clear cache
      this.#meta = null;
    }
    if (this.loading === "eager") {
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
    this.setAttribute("status", value);

    if (value === status.MOUNTED) {
      this.removeAttribute("recovering");
    }

    this.dispatchEvent(new Event("statuschange"));
  }

  #throwGlobalError(error: Error) {
    const moduleName =
      this.id || this.getAttribute("name") || this.import || this.localName;
    const prefix = `Web Widget module (${moduleName})`;
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
    return ["data", "inactive", "loading", "import", "meta"];
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

queueMicrotask(() => {
  const stateElement = document.querySelector(
    `script[name="state\\:web-router"]`
  ) as HTMLScriptElement;
  const state = stateElement
    ? JSON.parse(stateElement.textContent as string)
    : {};
  callContext(state, () => {
    customElements.define("web-widget", HTMLWebWidgetElement);
  });
});

declare global {
  interface Window {
    HTMLWebWidgetElement: typeof HTMLWebWidgetElement;
  }
  interface HTMLElementTagNameMap {
    "web-widget": HTMLWebWidgetElement;
  }
}
