/* eslint-disable class-methods-use-this */
import { INITIAL } from './status.js';
import { reasonableTime } from './timeouts.js';
import { rules } from './flow.js';

export class ApplicationService {
  constructor({
    loader,
    getDependencies,
    stateChangeCallback,
    context,
    timeouts
  }) {
    this.timeouts = timeouts;
    this.state = INITIAL;
    this.lifecycles = context;
    this.loader = loader.bind(this.lifecycles);
    this.getDependencies = getDependencies;
    this.stateChangeCallback = stateChangeCallback;
  }

  getState() {
    return this.state;
  }

  #setState(value) {
    if (value !== this.state) {
      this.state = value;
      this.stateChangeCallback();
    }
  }

  async trigger(name) {
    const timeout = this.timeouts[name];
    const dieOnTimeout = typeof timeout === 'number';
    const timeoutWarning = 1000;
    const rule = rules[name];
    const [initial, pending, fulfilled, rejected] = rule.status;

    if (!rule) {
      throw new Error(`Cannot ${name}`);
    }

    if (this.pending) {
      await this.pending;
    }

    if (rule.creator && !this.lifecycles[name]) {
      this.lifecycles[name] = async dependencies => {
        let lifecycles = await this.loader(dependencies);

        if (typeof lifecycles === 'function') {
          lifecycles = lifecycles(dependencies);
        }

        if (!lifecycles) {
          lifecycles = {};
        }

        Object.assign(this.lifecycles, lifecycles);
      };
    }

    if (initial !== this.state && rule.pre) {
      await this.trigger(rule.pre);
    }

    if (![initial, rejected].includes(this.state)) {
      if (rule.verify) {
        throw new Error(`Cannot ${name}: Application state: ${this.state}`);
      }
      return undefined;
    }

    this.#setState(pending);

    if (!this.lifecycles[name]) {
      this.#setState(fulfilled);
      return undefined;
    }

    this.pending = reasonableTime(
      name,
      async () => this.lifecycles[name](this.getDependencies(name)),
      dieOnTimeout ? timeout : rules[name].timeout,
      dieOnTimeout,
      timeoutWarning
    )
      .then(() => {
        this.#setState(fulfilled);
        delete this.pending;
      })
      .catch(error => {
        this.#setState(rejected);
        delete this.pending;
        throw error;
      });

    return this.pending;
  }
}
