export type StateLayerHandler = (
  value: any,
  index: number,
  array: any[]
) => void;

export class StateLayer implements ArrayLike<any> {
  #handler: StateLayerHandler;
  constructor(handler: StateLayerHandler) {
    this.#handler = handler;
  }
  readonly [n: number]: any;

  length: number = 0;

  push(...list: any[]) {
    const length = Array.prototype.push.apply(this, list);
    list.forEach(this.#handler);
    return length;
  }
}
