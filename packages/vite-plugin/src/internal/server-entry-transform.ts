import MagicString from 'magic-string';

export const SERVER_ENTRY_PLACEHOLDER = 'import.meta.framework';

export interface AssembleServerEntryTransformOptions {
  code: string;
  id: string;
  entryId: string;
  dev: boolean;
  manifestCode: string;
  metaCode: string;
  sourcemap?: boolean;
  placeholder?: string;
}

export function assembleServerEntryTransform(
  options: AssembleServerEntryTransformOptions
): { code: string; map: ReturnType<MagicString['generateMap']> | null } | null {
  const {
    code,
    id,
    entryId,
    manifestCode,
    metaCode,
    sourcemap = false,
    placeholder = SERVER_ENTRY_PLACEHOLDER,
  } = options;

  if (id !== entryId || !code.includes(placeholder)) {
    return null;
  }

  const FRAMEWORK = '__import_meta_framework__';
  const magicString = new MagicString(code);

  magicString.prepend(`const ${FRAMEWORK} = {};
        ${manifestCode}
        ${metaCode}
        `);

  magicString.replaceAll(placeholder, FRAMEWORK);

  return {
    code: magicString.toString(),
    map: sourcemap ? magicString.generateMap() : null,
  };
}

export function buildDevServerEntryMeta(
  framework: string,
  entryFileName: string
): string {
  const meta = {
    style: [{ content: 'web-widget{display:contents}' }],
    script: [
      { type: 'module', src: '/@vite/client' },
      { type: 'module', src: entryFileName },
    ],
  };

  return `${framework}.meta = ${JSON.stringify(meta, null, 2)};`;
}
