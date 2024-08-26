import { EXPOSE } from './constants';

export function allowExposedToClient(object: any, key: string) {
  if (typeof key !== 'string') {
    throw new TypeError('Key must be a string.');
  }
  object[EXPOSE] ??= new Set();
  object[EXPOSE].add(key);
}
