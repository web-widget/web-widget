import type { App } from 'vue';
import { cacheProviderIsLoading } from '@web-widget/helpers/cache';

export default function installErrorHandler(
  app: App<Element>,
  callback: (err: unknown) => void
) {
  /**
   * The thrown promise is not necessarily a real error,
   * it will be handled by the web widget container.
   * @link ../lifecycle-cache/src/provider.ts#cacheProviderIsLoading
   */
  app.config.errorHandler = (err, instance, info) => {
    if (cacheProviderIsLoading(err)) {
      return;
    }
    callback(err);
  };
}
