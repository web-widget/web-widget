import {
  INITIAL,
  LOADING,
  LOADED,
  LOAD_ERROR,
  BOOTSTRAPPING,
  BOOTSTRAPPED,
  BOOTSTRAP_ERROR,
  MOUNTING,
  MOUNTED,
  MOUNT_ERROR,
  UPDATING,
  UPDATE_ERROR,
  UNMOUNTING,
  UNMOUNT_ERROR,
  UNLOADING,
  UNLOAD_ERROR
} from './status.js';
import { reasonableTime } from './timeouts.js';

/** Application Lifecycles
 *                      ┌ <───────────────────────────┐
 * ┌> load ┐            │                             │
 * │       └> bootstrap ┤        ┌ <───────┐          │
 * │                    └> mount ┤         │          │
 * │                             └> update ┤          │
 * │                             │         └> unmount ┤
 * │                             └───────> ┘          └> unload ┐
 * │                                                            │
 * └ <──────────────────────────────────────────────────────────┘
 */
const rules = {
  load: {
    timeout: 12000,
    initial: INITIAL,
    pending: LOADING,
    fulfilled: LOADED,
    rejected: LOAD_ERROR,
    output: ['bootstrap']
  },
  bootstrap: {
    await: 'load',
    timeout: 4000,
    initial: LOADED,
    pending: BOOTSTRAPPING,
    fulfilled: BOOTSTRAPPED,
    rejected: BOOTSTRAP_ERROR,
    output: ['mount']
  },
  mount: {
    await: 'bootstrap',
    timeout: 3000,
    initial: BOOTSTRAPPED,
    pending: MOUNTING,
    fulfilled: MOUNTED,
    rejected: MOUNT_ERROR,
    output: ['update', 'unmount']
  },
  update: {
    verify: true,
    timeout: 3000,
    initial: MOUNTED,
    pending: UPDATING,
    fulfilled: MOUNTED,
    rejected: UPDATE_ERROR,
    output: ['update', 'unmount']
  },
  unmount: {
    timeout: 3000,
    initial: MOUNTED,
    pending: UNMOUNTING,
    fulfilled: BOOTSTRAPPED,
    rejected: UNMOUNT_ERROR,
    output: ['mount', 'unload']
  },
  unload: {
    await: 'unmount',
    timeout: 3000,
    initial: BOOTSTRAPPED,
    pending: UNLOADING,
    fulfilled: INITIAL,
    rejected: UNLOAD_ERROR,
    output: ['load']
  }
};

const SET_STATE = Symbol('setState');
export class Application {
  constructor() {
    this.promises = Object.create(null);
    this.lifecycles = Object.create(null);
    this.dependencies = Object.create(null);
    this.state = INITIAL;
  }

  getState() {
    return this.state;
  }

  [SET_STATE](value) {
    if (value !== this.state) {
      this.state = value;
      this.stateChangeCallback();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  stateChangeCallback() {}

  // eslint-disable-next-line class-methods-use-this
  createDependencies() {}

  defineLifecycle(name, lifecycle, timeout) {
    const fn = typeof lifecycle === 'function' ? lifecycle : async () => {};
    const dieOnTimeout = typeof timeout === 'number';
    const timeoutWarning = 1000;

    this.lifecycles[name] = () =>
      reasonableTime(
        name,
        async () => fn(this.dependencies),
        dieOnTimeout ? timeout : rules[name].timeout,
        dieOnTimeout,
        timeoutWarning
      );
  }

  async trigger(name) {
    const rule = rules[name];

    if (!rule) {
      throw new Error(`Cannot ${name}`);
    }

    if (rule.initial !== this.state && rule.await) {
      await this.trigger(rule.await);
    }

    if (this.promises[name]) {
      const cycle = rule.output.includes(name);
      if (cycle) {
        await this.promises[name];
      } else {
        return this.promises[name];
      }
    }

    if (rule.initial !== this.state) {
      if (rule.verify) {
        throw new Error(`Cannot ${name}: Application state: ${this.state}`);
      }
      return undefined;
    }

    if (!this.dependencies) {
      this.dependencies = this.createDependencies();
    }

    this[SET_STATE](rule.pending);

    if (!this.lifecycles[name]) {
      this.defineLifecycle(name);
    }

    this.promises[name] = this.lifecycles[name]()
      .then(() => {
        if (rule.output) {
          rule.output.forEach(name => {
            delete this.promises[name];
          });
        }
        this[SET_STATE](rule.fulfilled);
      })
      .catch(error => {
        delete this.promises[name];
        this[SET_STATE](rule.rejected);
        throw error;
      });

    return this.promises[name];
  }
}
