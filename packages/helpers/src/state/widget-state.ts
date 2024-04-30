import {
  asyncCacheProvider,
  syncCacheProvider,
} from '@web-widget/lifecycle-cache';
import { useRouteState } from './route-state';

/** @deprecated Use `import { asyncCacheProvider } from '@web-widget/helpers/cache'` instead. */
export const useWidgetAsyncState = asyncCacheProvider;

/** @deprecated Use `import { syncCacheProvider } from '@web-widget/helpers/cache'` instead. */
export const useWidgetSyncState = syncCacheProvider;

/**
 * @deprecated
 */
export const useWidgetState = useRouteState;

/**
 * @deprecated
 */
export const useAllWidgetState = useWidgetState;
