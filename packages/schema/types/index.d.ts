import { ActionModule } from './action-module';
import {
  MiddlewareModule,
  MiddlewareHandlers,
  MiddlewareHandler,
} from './middleware-module';
import {
  RouteModule,
  RouteHandlers,
  RouteHandler,
  RouteComponentProps,
  RouteComponent,
  RouteRenderContext,
  RouteRender,
} from './route-module';
import {
  ClientWidgetModule,
  ClientWidgetRender,
  ServerWidgetModule,
  ServerWidgetRender,
  WidgetComponent,
  WidgetComponentProps,
  WidgetRenderContext,
} from './widget-module';

export * from './action-module';
export * from './middleware-module';
export * from './route-module';
export * from './widget-module';
export * from './common';

export type Module = ServerModule | ClientModule;

export type ServerModule =
  | ServerWidgetModule
  | ActionModule
  | RouteModule
  | MiddlewareModule;

export type ClientModule = ClientWidgetModule | RouteModule;

export type Handlers<Data = unknown, Params = Record<string, string>> =
  | RouteHandlers<Data, Params>
  | MiddlewareHandlers;

export type Handler<Data = unknown, Params = Record<string, string>> =
  | RouteHandler<Data, Params>
  | MiddlewareHandler;

export type ComponentProps<Data = unknown, Params = Record<string, string>> =
  | WidgetComponentProps<Data>
  | RouteComponentProps<Data, Params>;

export type Component<Data = unknown, Params = Record<string, string>> =
  | WidgetComponent<Data>
  | RouteComponent<Data, Params>;

export type RenderContext<Data = unknown, Params = Record<string, string>> =
  | RouteRenderContext<Data, Params>
  | WidgetRenderContext<Data>;

export type Render<Data = unknown, Params = Record<string, string>> =
  | ServerRender<Data, Params>
  | ClientRender<Data, Params>;

export type ServerRender<Data = unknown, Params = Record<string, string>> =
  | ServerWidgetRender<Data>
  | RouteRender<Data, Params>;

export type ClientRender<Data = unknown, Params = Record<string, string>> =
  | ClientWidgetRender<Data>
  | RouteRender<Data, Params>;
