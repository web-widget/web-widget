/* eslint-disable class-methods-use-this */
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

/* Application Lifecycles
                    ┌───────────────────┐
                    │                   │
┌> load > bootstrap ┴> mount ┬> unmount ┴> unload ┐
│                            │                    │
│                           ┌┴> update ┐          │
│                           │          │          │
│                           └──────────┘          │
│                                                 │
└─────────────────────────────────────────────────┘
*/
const rules = {
  load: {
    timeout: 12000,
    status: [INITIAL, LOADING, LOADED, LOAD_ERROR]
  },
  bootstrap: {
    pre: 'load',
    timeout: 4000,
    status: [LOADED, BOOTSTRAPPING, BOOTSTRAPPED, BOOTSTRAP_ERROR]
  },
  mount: {
    pre: 'bootstrap',
    timeout: 3000,
    status: [BOOTSTRAPPED, MOUNTING, MOUNTED, MOUNT_ERROR]
  },
  update: {
    verify: true,
    timeout: 3000,
    status: [MOUNTED, UPDATING, MOUNTED, UPDATE_ERROR]
  },
  unmount: {
    timeout: 3000,
    status: [MOUNTED, UNMOUNTING, BOOTSTRAPPED, UNMOUNT_ERROR]
  },
  unload: {
    pre: 'unmount',
    timeout: 3000,
    status: [BOOTSTRAPPED, UNLOADING, INITIAL, UNLOAD_ERROR]
  }
};

const SET_STATE = Symbol('setState');
export class Application {
  constructor() {
    this.lifecycles = Object.create(null);
    this.dependencies = null;
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

  stateChangeCallback() {}

  createDependencies() {}

  defineLifecycle(name, lifecycle, timeout) {
    const fn = typeof lifecycle === 'function' ? lifecycle : async () => {};
    const dieOnTimeout = typeof timeout === 'number';
    const timeoutWarning = 1000;

    if (!this.dependencies) {
      this.dependencies = this.createDependencies() || {};
    }

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
    const [initial, pending, fulfilled, rejected] = rule.status;

    if (!rule) {
      throw new Error(`Cannot ${name}`);
    }

    if (this.task) {
      await this.task;
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

    this[SET_STATE](pending);

    if (!this.lifecycles[name]) {
      this.defineLifecycle(name);
    }

    this.task = this.lifecycles[name]()
      .then(() => {
        this[SET_STATE](fulfilled);
        delete this.task;
      })
      .catch(error => {
        this[SET_STATE](rejected);
        delete this.task;
        throw error;
      });

    return this.task;
  }
}
