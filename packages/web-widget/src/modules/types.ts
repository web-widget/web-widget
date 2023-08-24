import type {
  WidgetModule,
  WidgetRenderContext,
} from "@web-widget/schema/client-helpers";
export * from "@web-widget/schema/client-helpers";

type LifecycleV0<Context> = {
  bootstrap?: (context: Context) => Promise<void>;
  mount?: (context: Context) => Promise<void>;
  update?: (context: Context) => Promise<void>;
  unmount: (context: Context) => Promise<void>;
};

export interface WidgetModuleV0<Context = WidgetRenderContext>
  extends LifecycleV0<Context> {
  default?: (context: Context) => LifecycleV0<Context>;
}

export type WidgetModuleLoader = () => Promise<WidgetModule | WidgetModuleV0>;
