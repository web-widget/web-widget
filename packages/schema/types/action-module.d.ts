import { Serializable } from './common';

export interface ActionModule {
  [method: string]: ActionHandler;
}

export interface ActionHandler<
  A extends Serializable = Serializable,
  T extends Serializable = Serializable,
> {
  (...args: A[]): Promise<T>;
}
