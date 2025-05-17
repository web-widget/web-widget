import { SerializableValue } from './http';

export interface ActionModule {
  [method: string]: ActionHandler;
}

export interface ActionHandler<
  A extends SerializableValue = SerializableValue,
  T extends SerializableValue = SerializableValue,
> {
  (...args: A[]): Promise<T>;
}
