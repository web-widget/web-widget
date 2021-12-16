import { rocketLaunch } from '@rocket/launch';
import { rocketSearch } from '@rocket/search';
// eslint-disable-next-line import/no-unresolved
import { absoluteBaseUrlNetlify } from '@rocket/core/helpers';

/** @type {import('rocket/cli').RocketCliConfig} */
export default {
  presets: [rocketLaunch(), rocketSearch()],
  emptyOutputDir: false,
  absoluteBaseUrl: absoluteBaseUrlNetlify('http://localhost:8000')
  // pathPrefix: '/web-widget'
};
