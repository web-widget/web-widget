import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  nodeResolve: {
    browser: true,
  },
  rootDir: '../../',
  plugins: [esbuildPlugin({ ts: true, target: 'auto' })],
  coverageConfig: {
    include: ['src/**'],
  },
};
