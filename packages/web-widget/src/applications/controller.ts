import type {
  WidgetRenderResult,
  WidgetRenderContext,
  WidgetModuleLoader,
} from "./types";
import { render } from "./render";
import { INITIAL } from "./status";
import { reasonableTime } from "./timeouts";
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
    this.#lifecycles = Object.create(null);
    this.#status = INITIAL;
    this.#statusChangeCallback = options.statusChangeCallback;
    this.#timeouts = options.timeouts;
  }

  #moduleLoader: WidgetModuleLoader;

  #contextLoader: (name: string) => WidgetRenderContext;

  #lifecycles: WidgetRenderResult;

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

  async run(name) {
    const bail = typeof this.#timeouts[name] === "number";
    const timeout = bail ? this.#timeouts[name] : rules[name].timeout;
    const rule = rules[name];
    const [initial, pending, fulfilled, rejected] = rule.status;

    if (!rule) {
      throw new Error(`Cannot ${name}`);
    }

    if (this.#pending) {
      await this.#pending;
    }

    if (rule.creator && !this.#lifecycles[name]) {
      this.#lifecycles[name] = async (context: WidgetRenderContext) => {
        const application = await this.#moduleLoader();
        const lifecycles: WidgetRenderResult = await render(
          application,
          context
        );

        // @ts-ignore
        Object.assign(this.#lifecycles, lifecycles || {});
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

    if (!this.#lifecycles[name]) {
      this.#setStatus(fulfilled);
      return undefined;
    }

    this.#pending = reasonableTime(
      async () => {
        const renderContext = Object.assign(this.#contextLoader(name), {
          module: await this.#moduleLoader(),
        });
        return this.#lifecycles[name](renderContext);
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
