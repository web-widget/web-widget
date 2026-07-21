import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetHostProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import type { FunctionComponent, ReactNode } from 'react';

export type { WidgetContainerOptions } from '@web-widget/schema';

export type ReactWidgetContainerProps = WidgetContainerProps<ReactNode>;

export interface ReactWidgetProps extends WidgetHostProps {
  children?: ReactNode;
  /** Container configuration, isolated from widget's own props. */
  widget?: ReactWidgetContainerProps;
}

export interface ReactWidgetComponent<T> extends FunctionComponent<
  T & ReactWidgetProps
> {}

export interface ReactWidgetFactory {
  <M>(
    loader: () => Promise<M>,
    options?: WidgetContainerOptions
  ): ReactWidgetComponent<ExtractWidgetProps<M>>;
  <Props>(
    loader: WidgetModuleLoader,
    options?: WidgetContainerOptions
  ): ReactWidgetComponent<Props>;
}

export type WebWidgetProps = WebWidgetRendererOptions & {
  loader: WidgetModuleLoader;
  children?: ReactNode;
};
