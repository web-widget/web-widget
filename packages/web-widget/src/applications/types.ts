import type {
  WidgetModule,
  WidgetRenderContext,
} from "@web-widget/schema/client";
export * from "@web-widget/schema/client";

type Lifecycle<Context> = {
  bootstrap?: (context: Context) => Promise<void>;
  mount?: (context: Context) => Promise<void>;
  update?: (context: Context) => Promise<void>;
  unmount: (context: Context) => Promise<void>;
};

export interface WidgetModule_v0<Context = WidgetRenderContext>
  extends Lifecycle<Context> {
  default?: (context: Context) => Lifecycle<Context>;
}

export type WidgetModuleLoader = () => Promise<WidgetModule | WidgetModule_v0>;
