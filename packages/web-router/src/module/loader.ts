export type ModuleSource<T> = T | (() => Promise<T>);
export type ModuleLoader<T> = () => Promise<T>;

/** Runtime-scoped module loading with concurrent deduplication and retry. */
export class ModuleLoaderCache {
  #loaders = new WeakMap<ModuleLoader<unknown>, ModuleLoader<unknown>>();

  get<T>(source: ModuleSource<T>): ModuleLoader<T> {
    if (typeof source !== 'function') {
      const loaded = Promise.resolve(source);
      return () => loaded;
    }

    const moduleSource = source as ModuleLoader<T>;
    const cached = this.#loaders.get(moduleSource) as
      ModuleLoader<T> | undefined;
    if (cached) {
      return cached;
    }

    let pending: Promise<T> | undefined;
    const load = () => {
      if (!pending) {
        pending = Promise.resolve()
          .then(moduleSource)
          .catch((error) => {
            pending = undefined;
            throw error;
          });
      }
      return pending;
    };
    this.#loaders.set(moduleSource, load);
    return load;
  }
}
