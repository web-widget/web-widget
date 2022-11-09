/* eslint-disable class-methods-use-this */
import { INITIAL } from './status.js';
import { reasonableTime } from './timeouts.js';
import { rules } from './flow.js';

export class ApplicationService {
  constructor({ getApplication, getProperties, timeouts }) {
    this.timeouts = timeouts;
    this.state = INITIAL;
    this.lifecycles = Object.create(null);
    this.getApplication = getApplication.bind(this.lifecycles);
    this.getProperties = getProperties;
  }

  getState() {
    return this.state;
  }

  #setState(value) {
    if (value !== this.state) {
      this.state = value;
      this.stateChangeCallback(value);
    }
  }

  stateChangeCallback() {}

  async trigger(name) {
    const bail = typeof this.timeouts[name] === 'number';
    const timeout = bail ? this.timeouts[name] : rules[name].timeout;
    const rule = rules[name];
    const [initial, pending, fulfilled, rejected] = rule.status;

    if (!rule) {
      throw new Error(`Cannot ${name}`);
    }

    if (this.pending) {
      await this.pending;
    }

    if (rule.creator && !this.lifecycles[name]) {
      this.lifecycles[name] = async properties => {
        let lifecycles = await this.getApplication(properties);

        if (typeof lifecycles === 'function') {
          lifecycles = lifecycles(properties);
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
      async () =>
        this.lifecycles[name](this.getProperties.call(this.lifecycles, name)),
      timeout,
      bail,
      `Lifecycle function did not complete within ${timeout} ms: ${name}`
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
