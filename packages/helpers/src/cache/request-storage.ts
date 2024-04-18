import { useContext } from '@web-widget/context';
import { allowExposedToClient } from '@web-widget/context/server';

type RequestStorageOptions = {
  allowExposedToClient?: string[];
};

export class RequestStorage implements Storage {
  private storage: any;
  constructor(storage: any, options?: RequestStorageOptions) {
    this.storage = storage;
    if (options?.allowExposedToClient) {
      allowExposedToClient(storage, options.allowExposedToClient);
    }
  }

  get length() {
    return Object.keys(this.storage).length;
  }

  clear() {
    Object.keys(this.storage).forEach((key) => {
      delete this.storage[key];
    });
  }

  getItem(key: string) {
    return this.storage[key];
  }

  key(index: number) {
    return Object.keys(this.storage)[index];
  }

  removeItem(key: string) {
    delete this.storage[key];
  }

  setItem(key: string, value: any) {
    this.storage[key] = value;
  }
}

export function requestStorage(options?: RequestStorageOptions) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state } = useContext();
  const storage = new RequestStorage(state, options);
  return new Proxy<RequestStorage>(state as RequestStorage, {
    get(_o: any, k: string) {
      if (
        ['length', 'key', 'clear', 'removeItem', 'setItem', 'getItem'].includes(
          k
        )
      )
        return (storage as any)[k];
      else return storage.getItem(k);
    },

    set(_o, k: string, v: any) {
      storage.setItem(k, v);
      return true;
    },
  });
}
