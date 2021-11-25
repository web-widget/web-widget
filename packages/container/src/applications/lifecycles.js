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
    creator: true,
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
  constructor(loader, dependencies, timeouts) {
    this.loader = loader;
    this.timeouts = timeouts;
    this.state = INITIAL;
    this.lifecycles = Object.create(null);
    this.getDependencies = () => {
      if (typeof dependencies === 'function') {
        dependencies = dependencies();
      }
      return dependencies;
    };
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

    this[SET_STATE](pending);

    if (!this.lifecycles[name]) {
      this[SET_STATE](fulfilled);
      return undefined;
    }

    this.pending = reasonableTime(
      name,
      async () => this.lifecycles[name](this.getDependencies()),
      dieOnTimeout ? timeout : rules[name].timeout,
      dieOnTimeout,
      timeoutWarning
    )
      .then(() => {
        this[SET_STATE](fulfilled);
        delete this.pending;
      })
      .catch(error => {
        this[SET_STATE](rejected);
        delete this.pending;
        throw error;
      });

    return this.pending;
  }
}
