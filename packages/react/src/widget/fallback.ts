import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import type { ReactWidgetContainerProps } from './types';

export function resolveFallback(
  fallback: ReactWidgetContainerProps['fallback']
): {
  pendingFallback: ReactNode;
  errorFallback: ReactNode;
} {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    !isValidElement(fallback) &&
    !Array.isArray(fallback) &&
    ('pending' in fallback || 'error' in fallback)
  ) {
    const value = fallback as { pending?: ReactNode; error?: ReactNode };
    return {
      pendingFallback: value.pending,
      errorFallback: value.error ?? value.pending,
    };
  }
  return {
    pendingFallback: fallback as ReactNode,
    errorFallback: fallback as ReactNode,
  };
}
