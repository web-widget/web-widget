import {
  callContext,
  getRecoverableContext,
} from '@web-widget/helpers/context';
import { useWidgetState } from '@web-widget/helpers/state';

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

export function installStateLayer(callback: () => void) {
  callContext(getRecoverableContext(), () => {
    const currentState = self.stateLayer as unknown as undefined | any[];
    const allState = useWidgetState();
    self.stateLayer = new StateLayer((item) => Object.assign(allState, item));

    if (currentState) {
      self.stateLayer.push(...currentState);
    }

    callback();
  });
}

declare global {
  interface Window {
    stateLayer: StateLayer;
  }
}
