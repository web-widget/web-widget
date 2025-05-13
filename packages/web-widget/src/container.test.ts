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
    expect(container.status).to.equal(status.LOADED);

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

    await container.retry();
    expect(container.status).to.equal(status.LOADED);
  });
});
