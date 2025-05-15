import { Meta } from './meta';
import { ServerRender, ClientRender } from './render';

export interface ServerWidgetModule {
  default?: unknown;
  meta?: Meta;
  render?: ServerRender;
}

export interface ClientWidgetModule {
  default?: unknown;
  meta?: Meta;
  render?: ClientRender;
}
