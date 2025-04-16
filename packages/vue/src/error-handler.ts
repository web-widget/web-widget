import type { App } from 'vue';
import { cacheProviderIsLoading } from '@web-widget/helpers/cache';

export default function installErrorHandler(
  app: App<Element>,
  callback: (err: unknown) => void,
  throwUnhandledErrorInProduction = false
) {
  // @ts-ignore >= vue@3.5.0
  app.config.throwUnhandledErrorInProduction = throwUnhandledErrorInProduction;
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
