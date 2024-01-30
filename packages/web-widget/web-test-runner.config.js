import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  nodeResolve: true,
  rootDir: '../../',
  plugins: [esbuildPlugin({ ts: true, target: 'auto' })],
  coverageConfig: {
    include: ['src/**'],
  },
};
