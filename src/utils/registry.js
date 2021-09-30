export function createRegistry() {
  const map = new Map();
  return {
    [Symbol('data')]: map,
    get(name) {
      return map.get(name);
    },
    define(name, factory) {
      map.set(name, factory);
    }
  };
}
