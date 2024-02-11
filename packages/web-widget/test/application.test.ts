import { expect } from '@esm-bundle/chai';
import { status } from '../src/modules/status';
import {
  createApplication,
  createBaseContainer,
  defineTimeouts,
} from './application.adapter';

const {
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
  UNLOAD_ERROR,
} = status;

describe('Application lifecycle: load', () => {
  it('load', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, getStatusHistory, load }) => {
        const promise = load();
        expect(getStatus()).to.equal(LOADING);
        await promise;
        expect(getStatus()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);
        expect(getStatusHistory()).to.deep.equal([INITIAL, LOADING, LOADED]);
      }
    ));

  it('Loading should not be repeated', () =>
    createApplication(async ({ getStatus, getLifecycleHistory, load }) => {
      await load();
      await load();
      load();
      load();
      await load();
      expect(getStatus()).to.equal(LOADED);
      expect(getLifecycleHistory()).to.deep.equal(['load']);
    }));

  it('After execution fails, retry should be allowed', () => {
    let test = false;
    return createBaseContainer(
      {
        render: () => {
          if (!test) {
            test = true;
            throw new Error('error');
          }
        },
      },
      async ({ getStatus, getStatusHistory, load }) => {
        await load().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await load();
            expect(getStatus()).to.equal(LOADED);
            expect(getStatusHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOAD_ERROR,
              LOADING,
              LOADED,
            ]);
          }
        );
      }
    );
  });
});

describe('Application lifecycle: bootstrap', () => {
  it('bootstrap', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, load, bootstrap }) => {
        await load();
        const promise = bootstrap();
        expect(getStatus()).to.equal(BOOTSTRAPPING);
        await promise;
        expect(getStatus()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
      }
    ));

  it('It should load automatically before bootstrapping', () =>
    createApplication(async ({ getLifecycleHistory, getStatus, bootstrap }) => {
      await bootstrap();
      expect(getStatus()).to.equal(BOOTSTRAPPED);
      expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
    }));

  it('Mounting should not be repeated', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, load, bootstrap }) => {
        await load();
        await bootstrap();
        bootstrap();
        bootstrap();
        await bootstrap();
        expect(getStatus()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
      }
    ));

  it('After execution fails, retry should be allowed', () => {
    let test = false;
    return createBaseContainer(
      {
        render: () => ({
          bootstrap() {
            if (!test) {
              test = true;
              throw new Error('error');
            }
          },
        }),
      },
      async ({ getStatus, getStatusHistory, bootstrap }) => {
        await bootstrap().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await bootstrap();
            expect(getStatus()).to.equal(BOOTSTRAPPED);
            expect(getStatusHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOADED,
              BOOTSTRAPPING,
              BOOTSTRAP_ERROR,
              BOOTSTRAPPING,
              BOOTSTRAPPED,
            ]);
          }
        );
      }
    );
  });
});

describe('Application lifecycle: mount', () => {
  it('mount', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, load, bootstrap, mount }) => {
        await load();
        await bootstrap();
        const promise = mount();
        expect(getStatus()).to.equal(MOUNTING);
        await promise;
        expect(getStatus()).to.equal(MOUNTED);
        await mount();
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
        ]);
      }
    ));

  it('It should bootstrap automatically before mounting', () =>
    createApplication(async ({ getLifecycleHistory, getStatus, mount }) => {
      await mount();
      expect(getStatus()).to.equal(MOUNTED);
      expect(getLifecycleHistory()).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
      ]);
    }));

  it('Mounting should not be repeated', () =>
    createApplication(async ({ getLifecycleHistory, getStatus, mount }) => {
      await mount();
      await mount();
      mount();
      mount();
      await mount();
      expect(getStatus()).to.equal(MOUNTED);
      expect(getLifecycleHistory()).to.deep.equal([
        'load',
        'bootstrap',
        'mount',
      ]);
    }));

  it('After execution fails, retry should be allowed', () => {
    let test = false;
    return createBaseContainer(
      {
        render: () => ({
          mount() {
            if (!test) {
              test = true;
              throw new Error('error');
            }
          },
        }),
      },
      async ({ getStatus, getStatusHistory, mount }) => {
        await mount().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await mount();
            expect(getStatus()).to.equal(MOUNTED);
            expect(getStatusHistory()).to.deep.equal([
              INITIAL,
              LOADING,
              LOADED,
              BOOTSTRAPPING,
              BOOTSTRAPPED,
              MOUNTING,
              MOUNT_ERROR,
              MOUNTING,
              MOUNTED,
            ]);
          }
        );
      }
    );
  });
});

describe('Application lifecycle: update', () => {
  it('update', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getStatus,
        getData,
        load,
        bootstrap,
        mount,
        update,
      }) => {
        const data = { testValue: Date.now() };
        await load();
        await bootstrap();
        await mount();
        const promise = update({ data });
        expect(getStatus()).to.equal(UPDATING);
        await promise;
        expect(getData()).to.have.property('testValue', data.testValue);
        expect(getStatus()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
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
      async ({ getLifecycleHistory, getStatus, mount, update }) => {
        await mount();
        await update();
        await update();
        expect(getStatus()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'update',
        ]);
      }
    ));

  it('The order of updates should be guaranteed', () =>
    createApplication(
      async ({ getLifecycleHistory, getData, getStatus, mount, update }) => {
        type Data = {
          a: number;
        };
        await mount();
        await Promise.all([
          update({ data: { a: 1 } as Data }),
          update({ data: { a: 3 } as Data }),
        ]);
        expect(getStatus()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'update',
        ]);
        expect((getData() as Data).a).to.equal(3);
      }
    ));

  it('After execution fails, retry should be allowed', () => {
    let test = false;
    return createBaseContainer(
      {
        render: () => ({
          update() {
            if (!test) {
              test = true;
              throw new Error('error');
            }
          },
        }),
      },
      async ({ getStatus, getStatusHistory, mount, update }) => {
        await mount();
        await update().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await update();
            expect(getStatus()).to.equal(MOUNTED);
            expect(getStatusHistory()).to.deep.equal([
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
              MOUNTED,
            ]);
          }
        );
      }
    );
  });
});

describe('Application lifecycle: unmount', () => {
  it('unmount', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getStatus,
        load,
        bootstrap,
        mount,
        unmount,
      }) => {
        await load();
        await bootstrap();
        await mount();
        const promise = unmount();
        expect(getStatus()).to.equal(UNMOUNTING);
        await promise;
        expect(getStatus()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
        ]);
      }
    ));

  it('If it is not loaded, it should not be unmount', () =>
    createApplication(async ({ getLifecycleHistory, getStatus, unmount }) => {
      await unmount();
      expect(getStatus()).to.equal(INITIAL);
      expect(getLifecycleHistory()).to.deep.equal([]);
    }));

  it('If it is not bootstraped, it should not be unmount', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, load, unmount }) => {
        await load();
        await unmount();
        expect(getStatus()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);
      }
    ));

  it('If it is not mounted, it should not be unmount', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, load, bootstrap, unmount }) => {
        await load();
        await bootstrap();
        await unmount();
        expect(getStatus()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);
      }
    ));

  it('Unmounting should not be repeated', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, mount, unmount }) => {
        await mount();
        await unmount();
        unmount();
        unmount();
        await unmount();
        expect(getStatus()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
        ]);
      }
    ));

  it('After execution fails, retry should be allowed', () => {
    let test = false;
    return createBaseContainer(
      {
        render: () => ({
          unmount() {
            if (!test) {
              test = true;
              throw new Error('error');
            }
          },
        }),
      },
      async ({ getStatus, getStatusHistory, mount, unmount }) => {
        await mount();
        await unmount().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await unmount();
            expect(getStatus()).to.equal(BOOTSTRAPPED);
            expect(getStatusHistory()).to.deep.equal([
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
              BOOTSTRAPPED,
            ]);
          }
        );
      }
    );
  });
});

describe('Application lifecycle: unload', () => {
  it('unload', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getStatus,
        load,
        bootstrap,
        mount,
        unmount,
        unload,
      }) => {
        await load();
        await bootstrap();
        await mount();
        await unmount();
        const promise = unload();
        expect(getStatus()).to.equal(UNLOADING);
        await promise;
        expect(getStatus()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload',
        ]);
      }
    ));

  it('Updated data should be cleaned up', () =>
    createApplication(async ({ getData, mount, update, unmount, unload }) => {
      const data = {
        testValue: Date.now(),
      };
      await mount();
      await update({ data });
      expect(getData()).to.have.property('testValue', data.testValue);
      await unmount();
      expect(getData()).to.have.property('testValue', data.testValue);
      await unload();
      // >>>>> expect(getData()).to.not.have.property('testValue');
    }));

  it('If it is not loaded, it should not be unload', () =>
    createApplication(async ({ getLifecycleHistory, getStatus, unload }) => {
      await unload();
      expect(getStatus()).to.equal(INITIAL);
      expect(getLifecycleHistory()).to.deep.equal([]);
    }));

  it('If it is not bootstraped, it should not be unload', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, load, unload }) => {
        await load();
        await unload();
        expect(getStatus()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);
      }
    ));

  it('If it has been bootstraped, it should be allowed to unload', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, bootstrap, unload }) => {
        await bootstrap();
        await unload();
        expect(getStatus()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'unload',
        ]);
      }
    ));

  it('If it has been mounted, it should be unmount before being unload', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, mount, unload }) => {
        await mount();
        await unload();
        expect(getStatus()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload',
        ]);
      }
    ));

  it('Unloading should not be repeated', () =>
    createApplication(
      async ({ getLifecycleHistory, getStatus, mount, unload }) => {
        await mount();
        await unload();
        unload();
        unload();
        await unload();
        expect(getStatus()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'unmount',
          'unload',
        ]);
      }
    ));

  it('After unloading, the load should be allowed to continue', () =>
    createApplication(
      async ({
        getLifecycleHistory,
        getStatus,
        load,
        bootstrap,
        mount,
        update,
        unmount,
        unload,
      }) => {
        let promise;
        await mount();
        await unload();
        // eslint-disable-next-line no-param-reassign
        getLifecycleHistory().length = 0;

        promise = load();
        expect(getStatus()).to.equal(LOADING);
        await promise;
        expect(getStatus()).to.equal(LOADED);
        expect(getLifecycleHistory()).to.deep.equal(['load']);

        promise = bootstrap();
        expect(getStatus()).to.equal(BOOTSTRAPPING);
        await promise;
        expect(getStatus()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal(['load', 'bootstrap']);

        promise = mount();
        expect(getStatus()).to.equal(MOUNTING);
        await promise;
        expect(getStatus()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
        ]);

        promise = update();
        expect(getStatus()).to.equal(UPDATING);
        await promise;
        expect(getStatus()).to.equal(MOUNTED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
        ]);

        promise = unmount();
        expect(getStatus()).to.equal(UNMOUNTING);
        await promise;
        expect(getStatus()).to.equal(BOOTSTRAPPED);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'unmount',
        ]);

        promise = unload();
        expect(getStatus()).to.equal(UNLOADING);
        await promise;
        expect(getStatus()).to.equal(INITIAL);
        expect(getLifecycleHistory()).to.deep.equal([
          'load',
          'bootstrap',
          'mount',
          'update',
          'unmount',
          'unload',
        ]);
      }
    ));

  it('After execution fails, retry should be allowed', () => {
    let test = false;
    return createBaseContainer(
      {
        render: () => ({
          mount() {},
          unload() {
            if (!test) {
              test = true;
              throw new Error('error');
            }
          },
        }),
      },
      async ({ getStatus, getStatusHistory, mount, unload }) => {
        await mount();
        await unload().then(
          () => Promise.reject(new Error('Not rejected')),
          async () => {
            await unload();
            expect(getStatus()).to.equal(INITIAL);
            expect(getStatusHistory()).to.deep.equal([
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
              INITIAL,
            ]);
          }
        );
      }
    );
  });
});

describe('Application lifecycle: error', () => {
  it('bootstrap', () =>
    createBaseContainer(
      {
        render: () => ({
          bootstrap: async () => Promise.reject(),
        }),
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
        render: () => ({
          mount: async () => Promise.reject(),
        }),
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
        render: () => ({
          update: async () => Promise.reject(),
        }),
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
        render: () => ({
          unmount: async () => Promise.reject(),
        }),
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
        render: () => ({
          unload: async () => Promise.reject(),
        }),
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

describe('Application lifecycle: context', () => {
  it('Should have members', () =>
    createBaseContainer(
      {
        render: (context) => ({
          async bootstrap() {
            const expected = ['container', 'data'];
            expected.forEach((key) => {
              if (!(key in context)) {
                throw new Error(`"${key}" not found`);
              }
            });
          },
          mount() {},
        }),
      },
      async ({ bootstrap }) => {
        await bootstrap();
      }
    ));
});

describe('Application lifecycle: timeout', () => {
  it('Timeout should be handled correctly', () => {
    const timeout = 50;
    defineTimeouts({
      bootstrap: timeout,
    });

    function delay(time: number) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, time);
      });
    }

    return createBaseContainer(
      {
        render: () => ({
          async bootstrap() {
            return delay(timeout + 16);
          },
        }),
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
