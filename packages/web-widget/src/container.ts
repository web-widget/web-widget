import type {
  ClientWidgetModule,
  ClientRenderOptions,
  ClientRenderResult,
} from '@web-widget/helpers';

const INITIAL = 'initial';
const LOADING = 'loading';
const LOADED = 'loaded';
const BOOTSTRAPPING = 'bootstrapping';
const BOOTSTRAPPED = 'bootstrapped';
const MOUNTING = 'mounting';
const MOUNTED = 'mounted';
const UPDATING = 'updating';
const UNMOUNTING = 'unmounting';
const UNLOADING = 'unloading';
const LOAD_ERROR = 'load-error';
const BOOTSTRAP_ERROR = 'bootstrap-error';
const MOUNT_ERROR = 'mount-error';
const UPDATE_ERROR = 'update-error';
const UNMOUNT_ERROR = 'unmount-error';
const UNLOAD_ERROR = 'unload-error';
/**
 * The status of the widget module lifecycle.
 * It represents the current state of the widget module.
 * The status can be one of the following:
 * - `initial`: The initial state before loading the module.
 * - `loading`: The module is being loaded.
 * - `loaded`: The module has been loaded successfully.
 * - `bootstrapping`: The module is being bootstrapped.
 * - `bootstrapped`: The module has been bootstrapped successfully.
 * - `mounting`: The module is being mounted.
 * - `mounted`: The module has been mounted successfully.
 * - `updating`: The module is being updated.
 * - `unmounting`: The module is being unmounted.
 * - `unloading`: The module is being unloaded.
 * - `load-error`: An error occurred while loading the module.
 * - `bootstrap-error`: An error occurred while bootstrapping the module.
 * - `mount-error`: An error occurred while mounting the module.
 * - `update-error`: An error occurred while updating the module.
 * - `unmount-error`: An error occurred while unmounting the module.
 * - `unload-error`: An error occurred while unloading the module.
 */
export const status = {
  INITIAL,
  LOADING,
  LOADED,
  BOOTSTRAPPING,
  BOOTSTRAPPED,
  MOUNTING,
  MOUNTED,
  UPDATING,
  UNMOUNTING,
  UNLOADING,
  LOAD_ERROR,
  BOOTSTRAP_ERROR,
  MOUNT_ERROR,
  UPDATE_ERROR,
  UNMOUNT_ERROR,
  UNLOAD_ERROR,
} as const;

/**
 * Defines valid state transitions for the widget module lifecycle.
 */
const statusTransitions: Record<Status, Status[]> = {
  [INITIAL]: [LOADING],
  [LOADING]: [LOADED, LOAD_ERROR],
  [LOADED]: [BOOTSTRAPPING, UNLOADING],
  [BOOTSTRAPPING]: [BOOTSTRAPPED, BOOTSTRAP_ERROR],
  [BOOTSTRAPPED]: [MOUNTING, UNLOADING],
  [MOUNTING]: [MOUNTED, MOUNT_ERROR],
  [MOUNTED]: [UPDATING, UNMOUNTING],
  [UPDATING]: [MOUNTED, UPDATE_ERROR],
  [UNMOUNTING]: [LOADED, UNMOUNT_ERROR],
  [UNLOADING]: [INITIAL, UNLOAD_ERROR],
  [LOAD_ERROR]: [LOADING],
  [BOOTSTRAP_ERROR]: [BOOTSTRAPPING],
  [MOUNT_ERROR]: [MOUNTING],
  [UPDATE_ERROR]: [UPDATING],
  [UNMOUNT_ERROR]: [UNMOUNTING],
  [UNLOAD_ERROR]: [UNLOADING],
};

export type Lifecycle = 'load' | keyof ClientRenderResult;
export type ModuleContainerOptions = ClientRenderOptions;
export type ModuleLoader = () => Promise<ClientWidgetModule>;
export type Status = (typeof status)[keyof typeof status];
export type StatusListener = (status: Status, prevStatus: Status) => void;
export type Timeouts = Partial<Record<Lifecycle, number>>;

/**
 * A class that manages the lifecycle of a widget module.
 * It handles loading, bootstrapping, mounting, updating, unmounting, and unloading the widget.
 * It also manages the status of the widget and provides methods to interact with it.
 *
 * ```
 *         START
 *           |
 *           | INITIAL
 *           v
 * +-------------------+
 * |       load()      |
 * +-------------------+
 *           |
 *           | INITIAL -> LOADING
 *           | Success -> LOADED
 *           | Failure -> LOAD_ERROR
 *           v
 * +-------------------+
 * |    bootstrap()    |
 * +-------------------+
 *           |
 *           | LOADED -> BOOTSTRAPPING
 *           | Success -> BOOTSTRAPPED
 *           | Failure -> BOOTSTRAP_ERROR
 *           v
 * +-------------------+
 * |      mount()      |
 * +-------------------+
 *           |
 *           | BOOTSTRAPPED -> MOUNTING
 *           | Success -> MOUNTED
 *           | Failure -> MOUNT_ERROR
 *           v
 * +-------------------+
 * |      update()     |
 * +-------------------+
 *           |
 *           | MOUNTED -> UPDATING
 *           | Success -> MOUNTED
 *           | Failure -> UPDATE_ERROR
 *           v
 * +-------------------+
 * |     unmount()     |
 * +-------------------+
 *           |
 *           | MOUNTED -> UNMOUNTING
 *           | Success -> BOOTSTRAPPED
 *           | Failure -> UNMOUNT_ERROR
 *           v
 * +-------------------+
 * |      unload()     |
 * +-------------------+
 *           |
 *           | LOADED -> UNLOADING
 *           | Success -> INITIAL
 *           | Failure -> UNLOAD_ERROR
 *           v
 *          END
 *
 * Error states (e.g., LOAD_ERROR) are terminal until explicitly recovered by retrying load() or reset.
 * ```
 */
export class ModuleContainer<Data = unknown> {
  #moduleLoader: ModuleLoader;
  #module: ClientWidgetModule | null = null;
  #data: Data;
  #options: ClientRenderOptions;
  #lifecycle: ClientRenderResult<Data> = {};
  #currentStatus: Status = INITIAL;
  #statusListener: StatusListener | null = null;
  #timeouts?: Timeouts | null = null;

  constructor(
    moduleLoader: ModuleLoader,
    data: Data,
    options: ClientRenderOptions
  ) {
    this.#moduleLoader = moduleLoader;
    this.#data = data;
    this.#options = options;
  }

  get status() {
    return this.#currentStatus;
  }

  set onStatusChange(listener: StatusListener | null) {
    this.#statusListener = listener;
  }

  set timeouts(timeouts: Timeouts | null) {
    this.#timeouts = timeouts;
  }

  #setStatus(next: Status) {
    const prev = this.#currentStatus;
    this.#currentStatus = next;
    this.#statusListener?.(next, prev);
  }

  #canTransitionTo(next: Status): boolean {
    return statusTransitions[this.#currentStatus].includes(next);
  }

  async #safeExecute(
    action: Lifecycle,
    fn?: () => void | Promise<void>,
    errorStatus?: Status
  ) {
    if (!fn) return;
    const timeout = this.#timeouts?.[action] ?? 0;
    try {
      await withTimeout(Promise.resolve(fn()), timeout);
    } catch (err) {
      if (errorStatus) this.#setStatus(errorStatus);
      throw err;
    }
  }

  async #transition(
    action: Lifecycle,
    next: Status,
    errorStatus: Status,
    fn?: () => void | Promise<void>
  ) {
    if (!this.#canTransitionTo(next)) {
      throw new Error(
        `Cannot perform "${action}" from "${this.#currentStatus}" to "${next}".`
      );
    }
    this.#setStatus(next);
    try {
      await this.#safeExecute(action, fn, errorStatus);
    } catch (err) {
      throw err;
    }
  }

  /** Loads the widget module. */
  async load() {
    await this.#transition('load', LOADING, LOAD_ERROR, async () => {
      const mod = await withTimeout(
        this.#moduleLoader(),
        this.#timeouts?.load ?? 0
      );
      if (!mod?.render || typeof mod.render !== 'function') {
        throw new Error('Invalid module: missing render() function.');
      }
      this.#module = mod;
    });
    this.#setStatus(LOADED);
  }

  /** Bootstraps the widget module. */
  async bootstrap() {
    await this.#transition(
      'bootstrap',
      BOOTSTRAPPING,
      BOOTSTRAP_ERROR,
      async () => {
        const renderResult = await this.#module!.render!(
          this.#module!.default,
          this.#data,
          this.#options
        );
        this.#lifecycle = renderResult || {};
        await this.#safeExecute(
          'bootstrap',
          this.#lifecycle.bootstrap,
          BOOTSTRAP_ERROR
        );
      }
    );
    this.#setStatus(BOOTSTRAPPED);
  }

  /** Mounts the widget module. */
  async mount() {
    await this.#transition(
      'mount',
      MOUNTING,
      MOUNT_ERROR,
      this.#lifecycle.mount
    );
    this.#setStatus(MOUNTED);
  }

  /** Updates the widget module with new data. */
  async update(data: Data) {
    this.#data = data;
    await this.#transition('update', UPDATING, UPDATE_ERROR, () =>
      this.#lifecycle.update?.(data)
    );
    this.#setStatus(MOUNTED);
  }

  /** Unmounts the widget module. */
  async unmount() {
    await this.#transition(
      'unmount',
      UNMOUNTING,
      UNMOUNT_ERROR,
      this.#lifecycle.unmount
    );
    this.#setStatus(BOOTSTRAPPED);
  }

  /** Unloads the widget module. */
  async unload() {
    await this.#transition(
      'unload',
      UNLOADING,
      UNLOAD_ERROR,
      this.#lifecycle.unload
    );
    this.#module = null;
    this.#lifecycle = {};
    this.#setStatus(INITIAL);
  }

  /**
   * Retry the last failed operation based on the current error
   * Throws an error if the current status is not an error state.
   */
  async retry() {
    switch (this.#currentStatus) {
      case LOAD_ERROR:
        await this.load();
        break;
      case BOOTSTRAP_ERROR:
        await this.bootstrap();
        break;
      case MOUNT_ERROR:
        await this.mount();
        break;
      case UPDATE_ERROR:
        await this.update(this.#data);
        break;
      case UNMOUNT_ERROR:
        await this.unmount();
        break;
      case UNLOAD_ERROR:
        await this.unload();
        break;
      default:
        throw new Error(
          `Cannot retry operation from the current status: "${this.#currentStatus}".`
        );
    }
  }
}

/**
 * Wraps a promise with a timeout.
 * Rejects with a timeout error if the promise doesn't resolve in time.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out.')), timeoutMs)
    ),
  ]);
}
