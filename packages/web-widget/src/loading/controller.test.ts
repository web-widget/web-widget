import type { ModuleLoader, Status } from '../lifecycle/runtime';
import { status } from '../lifecycle/runtime';
import { type Loading, WidgetLoadingController } from './controller';

type TestHost = HTMLElement & {
  import: string;
  inactive: boolean;
  loader: ModuleLoader | null;
  loading: Loading;
  status: Status;
};

class TestIntersectionObserver implements IntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0];
  #callback: IntersectionObserverCallback;
  #targets = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.#callback = callback;
    TestIntersectionObserver.instances.push(this);
  }

  disconnect() {
    this.#targets.clear();
  }

  observe(target: Element) {
    this.#targets.add(target);
  }

  takeRecords() {
    return [];
  }

  unobserve(target: Element) {
    this.#targets.delete(target);
  }

  emit(isIntersecting = true) {
    const entries = Array.from(this.#targets, (target) => ({
      isIntersecting,
      target,
    })) as IntersectionObserverEntry[];
    this.#callback(entries, this);
  }
}

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('WidgetLoadingController', () => {
  const NativeIntersectionObserver = window.IntersectionObserver;
  const nativeRequestIdleCallback = window.requestIdleCallback;
  const nativeCancelIdleCallback = window.cancelIdleCallback;
  const hosts: TestHost[] = [];

  const createHost = (loading: Loading): TestHost => {
    const host = Object.assign(document.createElement('div'), {
      import: '/widget.js',
      inactive: false,
      loader: (() => Promise.resolve({})) as ModuleLoader,
      loading,
      status: status.INITIAL as Status,
    });
    host.style.display = 'block';
    document.body.appendChild(host);
    hosts.push(host);
    return host;
  };

  beforeEach(() => {
    TestIntersectionObserver.instances = [];
    window.IntersectionObserver =
      TestIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    hosts.splice(0).forEach((host) => host.remove());
    window.IntersectionObserver = NativeIntersectionObserver;
    window.requestIdleCallback = nativeRequestIdleCallback;
    window.cancelIdleCallback = nativeCancelIdleCallback;
  });

  it('mounts eager widgets immediately', async () => {
    const host = createHost('eager');
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        host.status = status.MOUNTED;
      },
      () => {}
    );

    controller.connect();
    await flushMicrotasks();

    expect(mounts).to.equal(1);
  });

  it('waits for visibility before mounting lazy widgets', async () => {
    const host = createHost('lazy');
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        host.status = status.MOUNTED;
      },
      () => {}
    );

    controller.connect();
    expect(mounts).to.equal(0);

    TestIntersectionObserver.instances[0].emit();
    await flushMicrotasks();

    expect(mounts).to.equal(1);
  });

  it('waits for browser idle time before mounting idle widgets', async () => {
    let idleCallback!: IdleRequestCallback;
    window.requestIdleCallback = (callback) => {
      idleCallback = callback;
      return 1;
    };
    window.cancelIdleCallback = () => {};
    const host = createHost('idle');
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        host.status = status.MOUNTED;
      },
      () => {}
    );

    controller.connect();
    expect(mounts).to.equal(0);

    idleCallback({ didTimeout: false, timeRemaining: () => 50 });
    await flushMicrotasks();

    expect(mounts).to.equal(1);
  });

  it('promotes auto widgets when the user interacts with them', async () => {
    const host = createHost('auto');
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        host.status = status.MOUNTED;
      },
      () => {}
    );

    controller.connect();
    host.dispatchEvent(new PointerEvent('pointerover'));
    await flushMicrotasks();
    await flushMicrotasks();

    expect(mounts).to.equal(1);
  });

  it('promotes auto widgets on touch-oriented pointer interaction', async () => {
    const host = createHost('auto');
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        host.status = status.MOUNTED;
      },
      () => {}
    );

    controller.connect();
    host.dispatchEvent(new PointerEvent('pointerdown'));
    await flushMicrotasks();
    await flushMicrotasks();

    expect(mounts).to.equal(1);
  });

  it('cancels pending auto work when disconnected', async () => {
    const host = createHost('auto');
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
      },
      () => {}
    );

    controller.connect();
    controller.disconnect();
    host.dispatchEvent(new PointerEvent('pointerover'));
    TestIntersectionObserver.instances[0].emit();
    await flushMicrotasks();

    expect(mounts).to.equal(0);
  });

  it('removes a visibility placeholder when observation is cancelled', () => {
    const host = createHost('lazy');
    host.style.display = 'contents';
    const controller = new WidgetLoadingController(
      host,
      async () => {},
      () => {}
    );

    controller.connect();
    expect(host.children).to.have.length(1);

    controller.disconnect();
    expect(host.children).to.have.length(0);
  });

  it('deduplicates mount requests while one is in progress', async () => {
    const host = createHost('eager');
    let mounts = 0;
    let finishMount!: () => void;
    const controller = new WidgetLoadingController(
      host,
      () =>
        new Promise<void>((resolve) => {
          mounts++;
          finishMount = resolve;
        }),
      () => {}
    );

    controller.connect();
    controller.sourceChanged();
    controller.sourceChanged();
    await flushMicrotasks();

    expect(mounts).to.equal(1);
    finishMount();
    await flushMicrotasks();
  });

  it('allows a load-error widget to retry after reporting the failure', async () => {
    const host = createHost('eager');
    let mounts = 0;
    let reported!: () => void;
    const errorReported = new Promise<void>((resolve) => {
      reported = resolve;
    });
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        if (mounts === 1) {
          host.status = status.LOAD_ERROR;
          throw new Error('load failed');
        }
        host.status = status.MOUNTED;
      },
      reported
    );

    controller.connect();
    await errorReported;
    controller.sourceChanged();
    await flushMicrotasks();

    expect(mounts).to.equal(2);
    expect(host.status).to.equal(status.MOUNTED);
  });

  it('does not mount inactive widgets or widgets without a source', async () => {
    const inactiveHost = createHost('eager');
    inactiveHost.inactive = true;
    const sourceLessHost = createHost('eager');
    sourceLessHost.import = '';
    sourceLessHost.loader = null;
    let mounts = 0;
    const mount = async () => {
      mounts++;
    };

    new WidgetLoadingController(inactiveHost, mount, () => {}).connect();
    new WidgetLoadingController(sourceLessHost, mount, () => {}).connect();
    await flushMicrotasks();

    expect(mounts).to.equal(0);
  });

  it('registers a lazy strategy when a source is added after connection', async () => {
    const host = createHost('lazy');
    host.import = '';
    host.loader = null;
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        host.status = status.MOUNTED;
      },
      () => {}
    );

    controller.connect();
    expect(TestIntersectionObserver.instances).to.have.length(0);

    host.import = '/widget.js';
    controller.sourceChanged();
    TestIntersectionObserver.instances[0].emit();
    await flushMicrotasks();

    expect(mounts).to.equal(1);
  });

  it('registers an idle strategy when an inactive widget becomes active', async () => {
    let idleCallback!: IdleRequestCallback;
    window.requestIdleCallback = (callback) => {
      idleCallback = callback;
      return 1;
    };
    window.cancelIdleCallback = () => {};
    const host = createHost('idle');
    host.inactive = true;
    let mounts = 0;
    const controller = new WidgetLoadingController(
      host,
      async () => {
        mounts++;
        host.status = status.MOUNTED;
      },
      () => {}
    );

    controller.connect();
    expect(idleCallback).to.equal(undefined);

    host.inactive = false;
    controller.inactiveChanged();
    idleCallback({ didTimeout: false, timeRemaining: () => 50 });
    await flushMicrotasks();

    expect(mounts).to.equal(1);
  });
});
