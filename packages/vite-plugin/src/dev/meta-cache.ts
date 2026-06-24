import type {
  LinkDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from '@web-widget/helpers';

type MetaResult = {
  link: LinkDescriptor[];
  style: StyleDescriptor[];
  script: ScriptDescriptor[];
};

const cache = new Map<string, { revision: number; meta: MetaResult }>();

export function getCachedMeta(
  filePath: string,
  revision: number
): MetaResult | undefined {
  const entry = cache.get(filePath);
  if (entry && entry.revision === revision) {
    return entry.meta;
  }
  return undefined;
}

export function setCachedMeta(
  filePath: string,
  revision: number,
  meta: MetaResult
): void {
  cache.set(filePath, { revision, meta });
}

export function clearMetaCacheForTests(): void {
  cache.clear();
}
