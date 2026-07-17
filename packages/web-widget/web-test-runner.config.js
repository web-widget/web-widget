import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  concurrentBrowsers: 1,
  concurrency: 1,
  nodeResolve: {
    browser: true,
  },
  rootDir: '../../',
  plugins: [esbuildPlugin({ ts: true, target: 'auto' })],
  coverageConfig: {
    include: ['src/**'],
  },
};
