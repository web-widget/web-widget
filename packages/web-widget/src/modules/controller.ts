import type {
  WidgetModuleLoader,
  WidgetRenderContext,
  WidgetRenderResult,
} from "./types";

import { INITIAL } from "./status";
import { reasonableTime } from "./timeouts";
import { render } from "./render";
import { rules } from "./flow";

interface LifecycleControllerOptions {
  moduleLoader: WidgetModuleLoader;
  contextLoader: (name: string) => WidgetRenderContext;
  statusChangeCallback: (status: string) => void;
  timeouts: Record<string, number>;
}

export class LifecycleController {
  constructor(options: LifecycleControllerOptions) {
    this.#moduleLoader = options.moduleLoader;
    this.#contextLoader = options.contextLoader;
    this.#lifecycle = Object.create(null);
    this.#status = INITIAL;
    this.#statusChangeCallback = options.statusChangeCallback;
    this.#timeouts = options.timeouts;
  }

  #moduleLoader: WidgetModuleLoader;

  #contextLoader: (name: string) => WidgetRenderContext;

  #lifecycle: WidgetRenderResult;

  #pending?: Promise<void> | null;

  #statusChangeCallback: (value: string) => void;

  #timeouts: Record<string, number>;

  #status: string;

  #setStatus(value: string) {
    if (value !== this.#status) {
      this.#status = value;
      this.#statusChangeCallback(value);
    }
  }

  get status() {
    return this.#status;
  }

  async run(name: string) {
    const bail = typeof this.#timeouts[name] === "number";
    // @ts-ignore
    const rule = rules[name];
    const timeout = bail ? this.#timeouts[name] : rule.timeout;

    const [initial, pending, fulfilled, rejected] = rule.status;

    if (!rule) {
      throw new Error(`Cannot ${name}`);
    }

    if (this.#pending) {
      await this.#pending;
    }

    // @ts-ignore
    if (rule.creator && !this.#lifecycle[name]) {
      //@ts-ignore
      this.#lifecycle[name] = async (context: WidgetRenderContext) => {
        const application = await this.#moduleLoader();
        const lifecycle: WidgetRenderResult = await render(
          application,
          context
        );

        // @ts-ignore
        Object.assign(this.#lifecycle, lifecycle || {});
      };
    }

    if (initial !== this.#status && rule.pre) {
      await this.run(rule.pre);
    }

    if (![initial, rejected].includes(this.#status)) {
      if (rule.verify) {
        throw new Error(`Cannot ${name}: WidgetModule status: ${this.#status}`);
      }
      return undefined;
    }

    this.#setStatus(pending);

    //@ts-ignore
    if (!this.#lifecycle[name]) {
      this.#setStatus(fulfilled);
      return undefined;
    }

    this.#pending = reasonableTime(
      async () => {
        const renderContext = Object.assign(this.#contextLoader(name), {
          module: await this.#moduleLoader(),
        });
        //@ts-ignore
        return this.#lifecycle[name](renderContext);
      },
      timeout,
      bail,
      `Lifecycle function did not complete within ${timeout} ms: ${name}`
    )
      .then(() => {
        this.#setStatus(fulfilled);
        this.#pending = null;
      })
      .catch((error) => {
        this.#setStatus(rejected);
        this.#pending = null;
        throw error;
      });

    return this.#pending;
  }
}
