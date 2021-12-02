import { expect } from '@esm-bundle/chai';

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
} from '../src/applications/status.js';
import {
  createApplication,
  createBaseContainer,
  defineTimeouts
} from './application.adapter.js';

describe('Application lifecycle: load', () => {
  it('load', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, getStateHistory, load }) => {
        const promise = load();
        expect(getState()).to.equal(LOADING);
        await promise;
        expect(getState()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);
        expect(getStateHistory()).to.deep.equal([INITIAL, LOADING, LOADED]);
      }
    ));

  it('Loading should not be repeated', () =>
    createApplication(async ({ getState, getLifecycleHistory, load }) => {
      await load();
      await load();
      load();
      load();
      await load();
      expect(getState()).to.equal(LOADED);
      expect(getLifecycleHistory()).to.deep.equal(['load']);
    }));

  it('After execution fails, retry should be allowed', () =>
    createBaseContainer(
      {
        application({ context }) {
          if (!context.test) {
            context.test = true;
            throw new Error('error');
          }
        }
      },
      async ({ getState, getStateHistory, load }) => {
        await load().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await load();
            expect(getState()).to.equal(LOADED);
            expect(getStateHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOAD_ERROR,
              LOADING,
              LOADED
            ]);
          }
        );
      }
    ));
});

describe('Application lifecycle: bootstrap', () => {
  it('bootstrap', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, load, bootstrap }) => {
        await load();
        const promise = bootstrap();
        expect(getState()).to.equal(BOOTSTRAPPING);
        await promise;
        expect(getState()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
      }
    ));

  it('It should load automatically before bootstraping', () =>
    createApplication(async ({ getLifecycleHistory, getState, bootstrap }) => {
      await bootstrap();
      expect(getState()).to.equal(BOOTSTRAPPED);
      expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
    }));

  it('Mounting should not be repeated', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, load, bootstrap }) => {
        await load();
        await bootstrap();
        bootstrap();
        bootstrap();
        await bootstrap();
        expect(getState()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
      }
    ));

  it('After execution fails, retry should be allowed', () =>
    createBaseContainer(
      {
        application: ({ context }) => ({
          bootstrap() {
            if (!context.test) {
              context.test = true;
              throw new Error('error');
            }
          }
        })
      },
      async ({ getState, getStateHistory, bootstrap }) => {
        await bootstrap().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await bootstrap();
            expect(getState()).to.equal(BOOTSTRAPPED);
            expect(getStateHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOADED,
              BOOTSTRAPPING,
              BOOTSTRAP_ERROR,
              BOOTSTRAPPING,
              BOOTSTRAPPED
            ]);
          }
        );
      }
    ));
});

describe('Application lifecycle: mount', () => {
  it('mount', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, load, bootstrap, mount }) => {
        await load();
        await bootstrap();
        const promise = mount();
        expect(getState()).to.equal(MOUNTING);
        await promise;
        expect(getState()).to.equal(MOUNTED);
        await mount();
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount'
        ]);
      }
    ));

  it('It should bootstrap automatically before mounting', () =>
    createApplication(async ({ getLifecycleHistory, getState, mount }) => {
      await mount();
      expect(getState()).to.equal(MOUNTED);
      expect(getLifecycleHistory()).to.deep.equal([
        'load',
        'bootstrap',
        'mount'
      ]);
    }));

  it('Mounting should not be repeated', () =>
    createApplication(async ({ getLifecycleHistory, getState, mount }) => {
      await mount();
      await mount();
      mount();
      mount();
      await mount();
      expect(getState()).to.equal(MOUNTED);
      expect(getLifecycleHistory()).to.deep.equal([
        'load',
        'bootstrap',
        'mount'
      ]);
    }));

  it('After execution fails, retry should be allowed', () =>
    createBaseContainer(
      {
        application: ({ context }) => ({
          mount() {
            if (!context.test) {
              context.test = true;
              throw new Error('error');
            }
          }
        })
      },
      async ({ getState, getStateHistory, mount }) => {
        await mount().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await mount();
            expect(getState()).to.equal(MOUNTED);
            expect(getStateHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOADED,
              BOOTSTRAPPING,
              BOOTSTRAPPED,
              MOUNTING,
              MOUNT_ERROR,
              MOUNTING,
              MOUNTED
            ]);
          }
        );
      }
    ));
});

describe('Application lifecycle: update', () => {
  it('update', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getState,
        getProperties,
        load,
        bootstrap,
        mount,
        update
      }) => {
        const testValue = Date.now();
        await load();
        await bootstrap();
        await mount();
        const promise = update({ testValue });
        expect(getState()).to.equal(UPDATING);
        await promise;
        expect(getProperties()).to.have.property('testValue', testValue);
        expect(getState()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update'
        ]);
      }
    ));

  it('If it is not loaded, the update should be rejected', () =>
    createApplication(({ getLifecycleHistory, update }) =>
      update().then(
        () => Promise.reject(new Error('Not rejected')),
        () => {
          expect(getLifecycleHistory()).to.deep.equal([]);
        }
      )
    ));

  it('If it is not bootstraped, the update should be rejected', () =>
    createApplication(async ({ getLifecycleHistory, load, update }) => {
      await load();
      await update().then(
        () => Promise.reject(new Error('Not rejected')),
        () => {
          expect(getLifecycleHistory()).to.deep.equal(['load']);
        }
      );
    }));

  it('If it is not mounted, the update should be rejected', () =>
    createApplication(
      async ({ getLifecycleHistory, load, bootstrap, update }) => {
        await load();
        await bootstrap();
        await update().then(
          () => Promise.reject(new Error('Not rejected')),
          () => {
            expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
          }
        );
      }
    ));

  it('Continuous updates should be allowed', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, mount, update }) => {
        await mount();
        await update();
        await update();
        expect(getState()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'update'
        ]);
      }
    ));

  it('The order of updates should be guaranteed', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getProperties,
        getState,
        mount,
        update
      }) => {
        await mount();
        await Promise.all([
          update({ data: { a: 1 } }),
          update({ data: { a: 3 } })
        ]);
        expect(getState()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'update'
        ]);
        expect(getProperties().data.a).to.equal(3);
      }
    ));

  it('After execution fails, retry should be allowed', () =>
    createBaseContainer(
      {
        application: ({ context }) => ({
          update() {
            if (!context.test) {
              context.test = true;
              throw new Error('error');
            }
          }
        })
      },
      async ({ getState, getStateHistory, mount, update }) => {
        await mount();
        await update().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await update();
            expect(getState()).to.equal(MOUNTED);
            expect(getStateHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOADED,
              BOOTSTRAPPING,
              BOOTSTRAPPED,
              MOUNTING,
              MOUNTED,
              UPDATING,
              UPDATE_ERROR,
              UPDATING,
              MOUNTED
            ]);
          }
        );
      }
    ));
});

describe('Application lifecycle: unmount', () => {
  it('unmount', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getState,
        load,
        bootstrap,
        mount,
        unmount
      }) => {
        await load();
        await bootstrap();
        await mount();
        const promise = unmount();
        expect(getState()).to.equal(UNMOUNTING);
        await promise;
        expect(getState()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount'
        ]);
      }
    ));

  it('If it is not loaded, it should not be unmount', () =>
    createApplication(async ({ getLifecycleHistory, getState, unmount }) => {
      await unmount();
      expect(getState()).to.equal(INITIAL);
      expect(getLifecycleHistory()).to.deep.equal([]);
    }));

  it('If it is not bootstraped, it should not be unmount', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, load, unmount }) => {
        await load();
        await unmount();
        expect(getState()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);
      }
    ));

  it('If it is not mounted, it should not be unmount', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, load, bootstrap, unmount }) => {
        await load();
        await bootstrap();
        await unmount();
        expect(getState()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
      }
    ));

  it('Unmounting should not be repeated', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, mount, unmount }) => {
        await mount();
        await unmount();
        unmount();
        unmount();
        await unmount();
        expect(getState()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount'
        ]);
      }
    ));

  it('After execution fails, retry should be allowed', () =>
    createBaseContainer(
      {
        application: ({ context }) => ({
          unmount() {
            if (!context.test) {
              context.test = true;
              throw new Error('error');
            }
          }
        })
      },
      async ({ getState, getStateHistory, mount, unmount }) => {
        await mount();
        await unmount().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await unmount();
            expect(getState()).to.equal(BOOTSTRAPPED);
            expect(getStateHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOADED,
              BOOTSTRAPPING,
              BOOTSTRAPPED,
              MOUNTING,
              MOUNTED,
              UNMOUNTING,
              UNMOUNT_ERROR,
              UNMOUNTING,
              BOOTSTRAPPED
            ]);
          }
        );
      }
    ));
});

describe('Application lifecycle: unload', () => {
  it('unload', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getState,
        load,
        bootstrap,
        mount,
        unmount,
        unload
      }) => {
        await load();
        await bootstrap();
        await mount();
        await unmount();
        const promise = unload();
        expect(getState()).to.equal(UNLOADING);
        await promise;
        expect(getState()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload'
        ]);
      }
    ));

  it('Updated data should be cleaned up', () =>
    createApplication(
      async ({ getProperties, mount, update, unmount, unload }) => {
        const testValue = Date.now();
        await mount();
        await update({ testValue });
        expect(getProperties()).to.have.property('testValue', testValue);
        await unmount();
        expect(getProperties()).to.have.property('testValue', testValue);
        await unload();
        expect(getProperties()).to.not.have.property('testValue');
      }
    ));

  it('If it is not loaded, it should not be unload', () =>
    createApplication(async ({ getLifecycleHistory, getState, unload }) => {
      await unload();
      expect(getState()).to.equal(INITIAL);
      expect(getLifecycleHistory()).to.deep.equal([]);
    }));

  it('If it is not bootstraped, it should not be unload', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, load, unload }) => {
        await load();
        await unload();
        expect(getState()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);
      }
    ));

  it('If it has been bootstraped, it should be allowed to unload', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, bootstrap, unload }) => {
        await bootstrap();
        await unload();
        expect(getState()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'unload'
        ]);
      }
    ));

  it('If it has been mounted, it should be unmount before being unload', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, mount, unload }) => {
        await mount();
        await unload();
        expect(getState()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload'
        ]);
      }
    ));

  it('Unloading should not be repeated', () =>
    createApplication(
      async ({ getLifecycleHistory, getState, mount, unload }) => {
        await mount();
        await unload();
        unload();
        unload();
        await unload();
        expect(getState()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload'
        ]);
      }
    ));

  it('After unloading, the load should be allowed to continue', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getState,
        load,
        bootstrap,
        mount,
        update,
        unmount,
        unload
      }) => {
        let promise;
        await mount();
        await unload();
        getLifecycleHistory().length = 0;

        promise = load();
        expect(getState()).to.equal(LOADING);
        await promise;
        expect(getState()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);

        promise = bootstrap();
        expect(getState()).to.equal(BOOTSTRAPPING);
        await promise;
        expect(getState()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);

        promise = mount();
        expect(getState()).to.equal(MOUNTING);
        await promise;
        expect(getState()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount'
        ]);

        promise = update();
        expect(getState()).to.equal(UPDATING);
        await promise;
        expect(getState()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update'
        ]);

        promise = unmount();
        expect(getState()).to.equal(UNMOUNTING);
        await promise;
        expect(getState()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'unmount'
        ]);

        promise = unload();
        expect(getState()).to.equal(UNLOADING);
        await promise;
        expect(getState()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'unmount',
          'unload'
        ]);
      }
    ));

  it('After execution fails, retry should be allowed', () =>
    createBaseContainer(
      {
        application: ({ context }) => ({
          unload() {
            if (!context.test) {
              context.test = true;
              throw new Error('error');
            }
          }
        })
      },
      async ({ getState, getStateHistory, mount, unload }) => {
        await mount();
        await unload().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await unload();
            expect(getState()).to.equal(INITIAL);
            expect(getStateHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOADED,
              BOOTSTRAPPING,
              BOOTSTRAPPED,
              MOUNTING,
              MOUNTED,
              UNMOUNTING,
              BOOTSTRAPPED,
              UNLOADING,
              UNLOAD_ERROR,
              UNLOADING,
              INITIAL
            ]);
          }
        );
      }
    ));
});

describe('Application lifecycle: error', () => {
  it('bootstrap', () =>
    createBaseContainer(
      {
        application: () => ({
          bootstrap: async () => Promise.reject()
        })
      },
      async ({ bootstrap }) => {
        await bootstrap().then(
          () => Promise.reject(new Error('Not rejected')),
          () => Promise.resolve()
        );
      }
    ));

  it('mount', () =>
    createBaseContainer(
      {
        application: () => ({
          mount: async () => Promise.reject()
        })
      },
      async ({ mount }) => {
        await mount().then(
          () => Promise.reject(new Error('Not rejected')),
          () => Promise.resolve()
        );
      }
    ));

  it('update', () =>
    createBaseContainer(
      {
        application: () => ({
          update: async () => Promise.reject()
        })
      },
      async ({ mount, update }) => {
        await mount();
        await update().then(
          () => Promise.reject(new Error('Not rejected')),
          () => Promise.resolve()
        );
      }
    ));

  it('unmount', () =>
    createBaseContainer(
      {
        application: () => ({
          unmount: async () => Promise.reject()
        })
      },
      async ({ mount, unmount }) => {
        await mount();
        await unmount().then(
          () => Promise.reject(new Error('Not rejected')),
          () => Promise.resolve()
        );
      }
    ));

  it('unload', () =>
    createBaseContainer(
      {
        application: () => ({
          unload: async () => Promise.reject()
        })
      },
      async ({ mount, unmount, unload }) => {
        await mount();
        await unmount();
        await unload().then(
          () => Promise.reject(new Error('Not rejected')),
          () => Promise.resolve()
        );
      }
    ));
});

describe('Application lifecycle: dependencies', () => {
  it('All lifecycle function injection dependencies should be the same', () =>
    createBaseContainer(
      {
        application(dependencies) {
          let current = dependencies;
          const message = 'Not equal';
          if (!current) {
            throw new Error('Unexpectedly empty');
          }
          return {
            async bootstrap(dependencies) {
              if (current !== dependencies) {
                throw new Error(message);
              }
              current = dependencies;
            },
            async mount(dependencies) {
              if (current !== dependencies) {
                throw new Error(message);
              }
              current = dependencies;
            },
            async update(dependencies) {
              if (current !== dependencies) {
                throw new Error(message);
              }
              current = dependencies;
            },
            async unmount(dependencies) {
              if (current !== dependencies) {
                throw new Error(message);
              }
              current = dependencies;
            },
            async unload(dependencies) {
              if (current !== dependencies) {
                throw new Error(message);
              }
              current = dependencies;
            }
          };
        }
      },
      async ({ bootstrap, mount, update, unmount, unload }) => {
        await bootstrap();
        await mount();
        await update();
        await unmount();
        await unload();
      }
    ));
});

describe('Application lifecycle: this', () => {
  it('The `this` object of all lifecycle functions should be the same', () =>
    createBaseContainer(
      {
        application() {
          let current = this;
          const message = 'Not equal';
          if (!current) {
            throw new Error('Unexpectedly empty');
          }
          return {
            async bootstrap() {
              if (current !== this) {
                throw new Error(message);
              }
              current = this;
            },
            async mount() {
              if (current !== this) {
                throw new Error(message);
              }
              current = this;
            },
            async update() {
              if (current !== this) {
                throw new Error(message);
              }
              current = this;
            },
            async unmount() {
              if (current !== this) {
                throw new Error(message);
              }
              current = this;
            },
            async unload() {
              if (current !== this) {
                throw new Error(message);
              }
              current = this;
            }
          };
        }
      },
      async ({ bootstrap, mount, update, unmount, unload }) => {
        await bootstrap();
        await mount();
        await update();
        await unmount();
        await unload();
      }
    ));
});

describe('Application lifecycle: timeout', () => {
  it('Timeout should be handled correctly', () => {
    const timeout = 50;
    defineTimeouts({
      bootstrap: timeout
    });

    function delay(time) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, time);
      });
    }

    return createBaseContainer(
      {
        application: () => ({
          async bootstrap() {
            return delay(timeout + 16);
          }
        })
      },
      async ({ bootstrap }) => {
        await bootstrap().then(
          () => Promise.reject(new Error('Not rejected')),
          () => Promise.resolve()
        );
      }
    );
  });
});
