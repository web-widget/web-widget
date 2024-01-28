import type { Plugin, UserConfig } from 'vite';

const GLOBAL_CONFIG = Symbol.for('GLOBAL_CONFIG');

export function defineAsyncOptions<T>(
  initialOptions: any = {}
): [T, (value: T) => void] {
  let optionsResolved = false;
  const check = (p: string | symbol) => {
    if (!optionsResolved) {
      throw new Error(`Plugin accesses unresolved options: ${String(p)}`);
    }
  };
  const options = new Proxy(initialOptions, {
    get(target, p) {
      check(p);
      return Reflect.get(target, p);
    },
    has(target, p) {
      check(p);
      return Reflect.has(target, p);
    },
  });

  return [
    options as T,
    function setOptions(value: T) {
      Object.assign(options, value);
      Object.freeze(options);
      optionsResolved = true;
    },
  ];
}

export function pluginContainer<T>(
  pluginFactory: (options: T) => Plugin | Plugin[],
  pluginOptionsFactory: (userConfig: UserConfig) => T,
  isGlobalOptions?: boolean
): Plugin[] {
  const [options, setOptions] = defineAsyncOptions<any>({});
  const plugin = pluginFactory(options as T);
  const plugins: Plugin[] = Array.isArray(plugin) ? plugin : [plugin];

  plugins.unshift({
    name: `${plugins[0].name}:resolve-config`,
    enforce: 'pre',
    async config(userConfig) {
      setOptions(pluginOptionsFactory(userConfig));
      if (isGlobalOptions) {
        Reflect.set(userConfig, GLOBAL_CONFIG, options);
      }
    },
  } as Plugin);

  return plugins;
}

export function getGlobalConfig<T>(userConfig: UserConfig): T | undefined {
  return Reflect.get(userConfig, GLOBAL_CONFIG);
}
