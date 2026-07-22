import { createElement, use, type ReactNode } from 'react';
import type { WidgetRenderResult, WidgetRenderTask } from './task';

interface WidgetViewProps {
  task: WidgetRenderTask;
  clientOnly?: boolean;
  errorFallback?: ReactNode;
  pendingFallback?: ReactNode;
}

function renderDirectChildren(task: WidgetRenderTask) {
  if (task.hasChildrenRenderer || !task.children) return undefined;
  return createElement(
    task.localName,
    { ...task.attributes, suppressHydrationWarning: true },
    task.children
  );
}

function renderPending(task: WidgetRenderTask, pendingFallback: ReactNode) {
  return createElement(
    task.localName,
    { ...task.attributes, suppressHydrationWarning: true },
    createElement(
      task.pendingBoundary.localName,
      {
        'aria-busy': task.pendingBoundary.ariaBusy,
        slot: task.pendingBoundary.slot,
        style: { display: task.pendingBoundary.display },
      },
      pendingFallback
    )
  );
}

function renderResult(
  task: WidgetRenderTask,
  result: WidgetRenderResult,
  errorFallback: ReactNode
) {
  if (result.status === 'error') {
    console.error('[ReactWidget] Rendering error:', result.error);
    return errorFallback;
  }

  return createElement(task.localName, {
    ...task.attributes,
    dangerouslySetInnerHTML: { __html: result.html },
    suppressHydrationWarning: true,
  });
}

export function StreamingWidgetView({
  task,
  clientOnly,
  errorFallback,
  pendingFallback,
}: WidgetViewProps) {
  const directChildren = renderDirectChildren(task);
  if (directChildren) return directChildren;

  // The client renderer only needs an opaque host. Its protected innerHTML
  // placeholder keeps SSR content intact while the nested Widget hydrates.
  if (task.opaqueInnerHTML !== undefined) {
    return renderResult(
      task,
      { status: 'success', html: task.opaqueInnerHTML },
      errorFallback
    );
  }

  if (clientOnly && typeof window === 'undefined' && pendingFallback != null) {
    return renderPending(task, pendingFallback);
  }

  return renderResult(task, use(task.result), errorFallback);
}

export async function BufferedWidgetView({
  task,
  clientOnly,
  errorFallback,
  pendingFallback,
}: WidgetViewProps) {
  const directChildren = renderDirectChildren(task);
  if (directChildren) return directChildren;

  if (clientOnly && pendingFallback != null) {
    return renderPending(task, pendingFallback);
  }

  // Awaiting here prevents React from retaining its Suspense replacement
  // protocol in HTML produced by a buffered server render.
  return renderResult(task, await task.result, errorFallback);
}
