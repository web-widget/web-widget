import {
  cacheAsyncProvider,
  cacheSyncProvider,
} from '@web-widget/lifecycle-cache';
import { useRouteState } from './route-state';

/** @deprecated Use `import { cacheAsyncProvider } from '@web-widget/helpers/cache'` instead. */
export const useWidgetAsyncState = (
  ...args: Parameters<typeof cacheAsyncProvider>
) => {
  console.warn(
    "Use `import { cacheAsyncProvider } from '@web-widget/helpers/cache'` instead."
  );
  return cacheAsyncProvider(args[0], args[1], true);
};

/** @deprecated Use `import { cacheSyncProvider } from '@web-widget/helpers/cache'` instead. */
export const useWidgetSyncState = (
  ...args: Parameters<typeof cacheSyncProvider>
) => {
  console.warn(
    "Use `import { cacheSyncProvider } from '@web-widget/helpers/cache'` instead."
  );
  return cacheSyncProvider(args[0], args[1], true);
};

/**
 * @deprecated
 */
export const useWidgetState = useRouteState;

/**
 * @deprecated
 */
export const useAllWidgetState = useWidgetState;
