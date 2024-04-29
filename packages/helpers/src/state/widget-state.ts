import {
  cacheAsyncProvider,
  cacheSyncProvider,
} from '@web-widget/lifecycle-cache';
import { useRouteState } from './route-state';

/** @deprecated Use `import { cacheAsyncProvider } from '@web-widget/helpers/cache'` instead. */
export const useWidgetAsyncState = cacheAsyncProvider;

/** @deprecated Use `import { cacheSyncProvider } from '@web-widget/helpers/cache'` instead. */
export const useWidgetSyncState = cacheSyncProvider;

/**
 * @deprecated
 */
export const useWidgetState = useRouteState;

/**
 * @deprecated
 */
export const useAllWidgetState = useWidgetState;
