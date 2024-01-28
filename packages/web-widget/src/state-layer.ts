import {
  callContext,
  createContext,
  useAllWidgetState,
} from '@web-widget/helpers/context';

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
  const stateElement = document.querySelector(
    `script[id="state\\:web-router"]`
  ) as HTMLScriptElement;
  const context = stateElement
    ? JSON.parse(stateElement.textContent as string)
    : {};

  callContext(createContext(context), () => {
    const currentState = self.stateLayer as unknown as undefined | any[];
    const allState = useAllWidgetState();
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
