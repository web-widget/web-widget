import { expect } from '@esm-bundle/chai';
import { ModuleContainer, ModuleLoader, status } from './container';

describe('ModuleContainer', () => {
  let mockModuleLoader: ModuleLoader;
  let container: ModuleContainer<any>;

  beforeEach(() => {
    mockModuleLoader = async () => ({
      render: async () => ({
        bootstrap: async () => {},
        mount: async () => {},
        update: async () => {},
        unmount: async () => {},
        unload: async () => {},
      }),
    });

    container = new ModuleContainer(mockModuleLoader, null, {
      container: document.createDocumentFragment(),
    });
  });

  it('should initialize with status INITIAL', () => {
    expect(container.status).to.equal(status.INITIAL);
  });

  it('should transition to LOADING and then LOADED on successful load', async () => {
    await container.load();
    expect(container.status).to.equal(status.LOADED);
  });

  it('should transition to LOAD_ERROR on load failure', async () => {
    mockModuleLoader = async () => {
      throw new Error('Load failed');
    };
    container = new ModuleContainer(mockModuleLoader, null, {
      container: document.createDocumentFragment(),
    });

    try {
      await container.load();
    } catch (e) {
      expect(container.status).to.equal(status.LOAD_ERROR);
    }
  });

  it('should handle lifecycle transitions correctly', async () => {
    await container.load();
    await container.bootstrap();
    expect(container.status).to.equal(status.BOOTSTRAPPED);

    await container.mount();
    expect(container.status).to.equal(status.MOUNTED);

    await container.update(null);
    expect(container.status).to.equal(status.MOUNTED);

    await container.unmount();
    expect(container.status).to.equal(status.BOOTSTRAPPED);

    await container.unload();
    expect(container.status).to.equal(status.INITIAL);
  });

  it('should retry failed operations', async () => {
    let index = 0;
    mockModuleLoader = async () => {
      if (index === 0) {
        index++;
        throw new Error('Load failed');
      }
      return {
        render: async () => ({
          mount: async () => {},
        }),
      };
    };
    container = new ModuleContainer(mockModuleLoader, null, {
      container: document.createDocumentFragment(),
    });

    try {
      await container.load();
    } catch (e) {
      expect(container.status).to.equal(status.LOAD_ERROR);
    }

    await container.load();
    expect(container.status).to.equal(status.LOADED);
  });

  it('should call onStatusChange listener on status change', async () => {
    const statusChanges: [string, string][] = [];
    container.onStatusChange = (newStatus, prevStatus) => {
      statusChanges.push([newStatus, prevStatus]);
    };

    await container.load();
    expect(statusChanges).to.deep.equal([
      [status.LOADING, status.INITIAL],
      [status.LOADED, status.LOADING],
    ]);

    await container.bootstrap();
    expect(statusChanges).to.deep.equal([
      [status.LOADING, status.INITIAL],
      [status.LOADED, status.LOADING],
      [status.BOOTSTRAPPING, status.LOADED],
      [status.BOOTSTRAPPED, status.BOOTSTRAPPING],
    ]);
  });

  it('should respect timeouts for lifecycle methods', async () => {
    container.timeouts = { load: 10 };

    mockModuleLoader = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20)); // Simulate delay
      return {
        render: async () => ({
          bootstrap: async () => {},
          mount: async () => {},
          update: async () => {},
          unmount: async () => {},
          unload: async () => {},
        }),
      };
    };

    container = new ModuleContainer(mockModuleLoader, null, {
      container: document.createDocumentFragment(),
    });

    try {
      await container.load();
    } catch (err) {
      if (err instanceof Error) {
        expect(err.message).to.equal('Operation timed out.');
        expect(container.status).to.equal(status.LOAD_ERROR);
      } else {
        throw err; // Re-throw if it's not an Error
      }
    }
  });

  it('should update data and call update lifecycle method', async () => {
    let updateCalledWith = null;

    mockModuleLoader = async () => ({
      render: async () => ({
        update: (data) => {
          updateCalledWith = data;
        },
      }),
    });

    container = new ModuleContainer(
      mockModuleLoader,
      { key: 'initial' },
      {
        container: document.createDocumentFragment(),
      }
    );

    await container.load();
    await container.bootstrap();
    await container.mount();

    await container.update({ key: 'updated' });

    expect(updateCalledWith).to.deep.equal({ key: 'updated' });
    expect(container.status).to.equal(status.MOUNTED);
  });
});
