import type { ConfigEnv, SSRTarget } from 'vite';
import type { InlineConfig as VitestInlineConfig } from 'vitest/node';

export function mergeRouterVitestConfig(
  userTest: VitestInlineConfig | undefined,
  serverTarget: SSRTarget,
  env: ConfigEnv
): VitestInlineConfig | undefined {
  if (userTest?.pool) {
    return userTest;
  }

  const isVitest = process.env.VITEST === 'true' || env.mode === 'test';

  if (!isVitest && userTest === undefined) {
    return undefined;
  }

  const environment =
    userTest?.environment ??
    (serverTarget === 'webworker' ? 'edge-runtime' : 'node');

  const injectedSetupFile =
    environment === 'edge-runtime'
      ? '@web-widget/vite-plugin/vitest-edge-runtime-environment'
      : environment === 'node'
        ? '@web-widget/vite-plugin/vitest-node-environment'
        : undefined;

  const userSetupFiles = userTest?.setupFiles
    ? Array.isArray(userTest.setupFiles)
      ? userTest.setupFiles
      : [userTest.setupFiles]
    : [];

  const setupFiles = injectedSetupFile
    ? Array.from(new Set([...userSetupFiles, injectedSetupFile]))
    : userSetupFiles;

  return {
    ...userTest,
    environment,
    ...(setupFiles.length ? { setupFiles } : {}),
  };
}
