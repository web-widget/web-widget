import {
  WebWidgetRenderer,
  type WebWidgetPendingBoundary,
} from '@web-widget/web-widget';
import type { ReactNode } from 'react';
import type { WebWidgetProps } from './types';

export type WidgetRenderResult =
  { status: 'success'; html: string } | { status: 'error'; error: Error };

export interface WidgetRenderTask {
  localName: string;
  pendingBoundary: WebWidgetPendingBoundary;
  attributes: Record<string, string>;
  children?: ReactNode;
  hasChildrenRenderer: boolean;
  result: Promise<WidgetRenderResult>;
}

type CreateWidgetRenderTaskOptions = WebWidgetProps & {
  renderChildren?: (children: ReactNode) => Promise<string>;
};

export function createWidgetRenderTask({
  children,
  loader,
  renderChildren,
  ...options
}: CreateWidgetRenderTaskOptions): WidgetRenderTask {
  if (!loader) {
    throw new TypeError('Missing loader.');
  }

  const renderer = new WebWidgetRenderer(loader, options);
  const { attributes, localName } = renderer;

  const result = (async (): Promise<WidgetRenderResult> => {
    try {
      if (!renderChildren) {
        const html = children ? '' : await renderer.renderInnerHTMLToString();
        return { status: 'success', html };
      }
      if (!children) {
        const html = await renderer.renderInnerHTMLToString();
        return { status: 'success', html };
      }

      const lightChildrenHTML = await renderChildren(children);
      const html = await renderer.renderInnerHTMLToString({
        children: lightChildrenHTML,
      });
      return { status: 'success', html };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  })();

  return {
    attributes,
    children,
    hasChildrenRenderer: renderChildren !== undefined,
    localName,
    pendingBoundary: renderer.pendingBoundary,
    result,
  };
}
