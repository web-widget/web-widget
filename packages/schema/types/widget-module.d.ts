import { Meta } from './common';
import { ServerRenderFunction, ClientRenderFunction } from './render-contract';

export interface ServerWidgetModule {
  default?: unknown;
  meta?: Meta;
  render?: ServerRenderFunction;
}

export interface ClientWidgetModule {
  default?: unknown;
  meta?: Meta;
  render?: ClientRenderFunction;
}
