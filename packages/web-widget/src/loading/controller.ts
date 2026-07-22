import type { ModuleLoader, Status } from '../lifecycle/runtime';
import { status } from '../lifecycle/runtime';
import { WEB_WIDGET_RECOVERING_CHANGE_EVENT } from '../shared/constants';
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
  #disconnectRecoveryGate?: () => void;
  #disconnectStrategy?: () => void;
  #host: LoadingHost;
  #mount: () => Promise<void>;
  #mountPromise: Promise<void> | null = null;
  #mountRequested = false;
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
    this.#disconnectRecoveryGate?.();
    this.#disconnectRecoveryGate = undefined;
    this.#disconnectStrategy?.();
    this.#disconnectStrategy = undefined;
    this.#mountRequested = false;
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
    if (this.#mountPromise) {
      this.#mountRequested = true;
      return this.#mountPromise;
    }
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
    if (this.#waitForRecovery()) return;

    this.#mountPromise = Promise.resolve().then(async () => {
      try {
        await this.#mount();
      } catch (error) {
        this.#reportError(error);
      } finally {
        this.#mountPromise = null;
        if (this.#mountRequested) {
          this.#mountRequested = false;
          this.#autoMount();
        }
      }
    });
    return this.#mountPromise;
  }

  #waitForRecovery() {
    const ancestor = this.#host.parentElement?.closest(
      'web-widget[recovering]'
    );
    if (!ancestor) return false;
    if (this.#disconnectRecoveryGate) return true;

    const resume = () => {
      if (ancestor.hasAttribute('recovering')) return;
      this.#disconnectRecoveryGate?.();
      this.#disconnectRecoveryGate = undefined;
      if (this.#host.isConnected) this.#autoMount();
    };
    ancestor.addEventListener(WEB_WIDGET_RECOVERING_CHANGE_EVENT, resume);
    this.#disconnectRecoveryGate = () =>
      ancestor.removeEventListener(WEB_WIDGET_RECOVERING_CHANGE_EVENT, resume);
    return true;
  }
}
