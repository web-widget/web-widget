import { lifecycleCache } from '@web-widget/helpers/cache';

export default () => {
  const cache = lifecycleCache<{ testName: string }>();
  const testName = cache.get('testName');

  return <div>Cache value: {testName}</div>;
};
