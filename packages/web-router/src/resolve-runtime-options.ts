import type { DevOption, DevRuntimeConfig, Manifest } from './types';
import { DEV_RUNTIME_DEFAULTS } from './types';

export interface ResolvedRuntimeOptions {
  exposeErrors: boolean;
  progressive: boolean;
  moduleSource?: DevRuntimeConfig['moduleSource'];
}

export interface ResolveRuntimeOptionsInput {
  manifest: Partial<Manifest>;
  dev?: DevOption;
}

function normalizeDevConfig(
  dev: DevOption | undefined
): DevRuntimeConfig | null {
  if (dev === undefined || dev === false) {
    return null;
  }
  if (dev === true) {
    return { ...DEV_RUNTIME_DEFAULTS };
  }
  return {
    ...DEV_RUNTIME_DEFAULTS,
    ...dev,
  };
}

export function resolveRuntimeOptions(
  input: ResolveRuntimeOptionsInput
): ResolvedRuntimeOptions {
  const devConfig = normalizeDevConfig(input.dev ?? input.manifest.dev);

  return {
    exposeErrors: devConfig?.exposeErrors ?? false,
    progressive: devConfig?.progressive ?? false,
    moduleSource: devConfig?.moduleSource,
  };
}
