import type { ModuleLoader, Status } from '../lifecycle/runtime';
import { status } from '../lifecycle/runtime';
import { scheduleAutoMount } from './auto';
import { createIdleObserver } from './idle';
import { createVisibleObserver } from './visible';

export type Loading = 'auto' | 'eager' | 'lazy' | 'idle';

interface LoadingHost extends Element {
  import: string;
  inactive: boolean;
  loader: ModuleLoader | null;
  loading: Loading;
  status: Status;
}

export class WidgetLoadingController {
  #disconnectStrategy?: () => void;
  #host: LoadingHost;
  #mount: () => Promise<void>;
  #mountPromise: Promise<void> | null = null;
  #reportError: (error: unknown) => void;

  constructor(
    host: LoadingHost,
    mount: () => Promise<void>,
    reportError: (error: unknown) => void
  ) {
    this.#host = host;
    this.#mount = mount;
    this.#reportError = reportError;
  }

  connect() {
    this.#configureStrategy();
  }

  disconnect() {
    this.#disconnectStrategy?.();
    this.#disconnectStrategy = undefined;
  }

  loadingChanged() {
    if (this.#host.isConnected) this.#resetStrategy();
  }

  sourceChanged() {
    if (this.#host.loading === 'eager') {
      this.#autoMount();
    } else if (this.#host.loading === 'auto' && this.#host.isConnected) {
      this.#resetStrategy();
    }
  }

  #resetStrategy() {
    this.disconnect();
    if (!this.#mountPromise) this.#configureStrategy();
  }

  #configureStrategy() {
    const strategies: Record<Loading, () => void> = {
      auto: () => {
        this.#disconnectStrategy = scheduleAutoMount(
          this.#host,
          () => this.#autoMount(),
          createVisibleObserver
        );
      },
      eager: () => {
        this.#autoMount();
      },
      lazy: () => {
        this.#disconnectStrategy = createVisibleObserver(this.#host, () =>
          this.#autoMount()
        );
      },
      idle: () => {
        this.#disconnectStrategy = createIdleObserver(this.#host, () =>
          this.#autoMount()
        );
      },
    };

    strategies[this.#host.loading]?.();
  }

  #autoMount() {
    if (this.#mountPromise) return this.#mountPromise;
    if (
      !this.#host.isConnected ||
      this.#host.inactive ||
      !(this.#host.import || this.#host.loader)
    ) {
      return;
    }
    if (
      this.#host.status !== status.INITIAL &&
      this.#host.status !== status.LOAD_ERROR
    ) {
      return;
    }

    this.#mountPromise = Promise.resolve().then(async () => {
      try {
        await this.#mount();
      } catch (error) {
        this.#reportError(error);
      } finally {
        this.#mountPromise = null;
      }
    });
    return this.#mountPromise;
  }
}
