/* eslint-disable class-methods-use-this */
import type { ClientRenderResult, ClientRenderContext, ApplicationLoader } from './types.js'
import { render } from './render-client.js';
import { INITIAL } from './status.js';
import { reasonableTime } from './timeouts.js';
import { rules } from './flow.js';

interface LifecycleControllerOptions {
  applicationLoader: ApplicationLoader
  contextLoader: (name: string) => ClientRenderContext
  statusChangeCallback: (status: string) => void
  timeouts: Record<string, number>
}

export class LifecycleController {
  constructor(options: LifecycleControllerOptions) {
    this.#applicationLoader = options.applicationLoader;
    this.#contextLoader = options.contextLoader;
    this.#lifecycles = Object.create(null);
    this.#status = INITIAL;
    this.#statusChangeCallback = options.statusChangeCallback;
    this.#timeouts = options.timeouts;
  }

  #applicationLoader: ApplicationLoader

  #contextLoader: (name: string) => ClientRenderContext

  #lifecycles: ClientRenderResult

  #pending?: Promise<void> | null

  #statusChangeCallback: (value: string) => void

  #timeouts: Record<string, number>

  #status: string

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
    const bail = typeof this.#timeouts[name] === 'number';
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
      this.#lifecycles[name] = async (context: ClientRenderContext) => {
        const application = await this.#applicationLoader();
        const lifecycles: ClientRenderResult = await render(application, context);

        Object.assign(this.#lifecycles, lifecycles || {});
      };
    }

    if (initial !== this.#status && rule.pre) {
      await this.run(rule.pre);
    }

    if (![initial, rejected].includes(this.#status)) {
      if (rule.verify) {
        throw new Error(`Cannot ${name}: Application status: ${this.#status}`);
      }
      return undefined;
    }

    this.#setStatus(pending);

    if (!this.#lifecycles[name]) {
      this.#setStatus(fulfilled);
      return undefined;
    }

    this.#pending = reasonableTime(
      async () =>
        this.#lifecycles[name](this.#contextLoader(name)),
      timeout,
      bail,
      `Lifecycle function did not complete within ${timeout} ms: ${name}`
    )
      .then(() => {
        this.#setStatus(fulfilled);
        this.#pending = null;
      })
      .catch(error => {
        this.#setStatus(rejected);
        this.#pending = null;
        throw error;
      });

    return this.#pending;
  }
}
