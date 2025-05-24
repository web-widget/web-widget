type ImportName = [name: string, alias?: string];

/**
 * Extracts all import names from a full import statement using token parsing.
 *
 * `import { html, css as litCss } from 'lit'`
 * => [[ 'html' ], [ 'css', 'litCss' ]]
 */
export function parseImportStatement(importStatement: string): ImportName[] {
  const importNames: ImportName[] = [];
  // Remove JS comments and trim leading/trailing whitespace
  const code = importStatement.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').trim();

  const singleLine = code.replace(/\n+/g, '');
  const fromIndex = singleLine.indexOf('from');
  if (fromIndex >= 0) {
    let parts: [defaultAndNamespacesPart: string, namedPart: string];

    if (code.includes('{')) {
      const startsWith = code.indexOf('{');
      const endsWith = code.indexOf('}');
      const defaultAndNamespacesPart = code.substring(6, startsWith);
      const namedPart = code.substring(startsWith + 1, endsWith);
      parts = [defaultAndNamespacesPart, namedPart];
    } else {
      const index = code.indexOf('from');
      const defaultAndNamespacesPart = code.substring(6, index);
      parts = [defaultAndNamespacesPart, ''];
    }

    const list = parts.map((string) =>
      string
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    );

    for (const [index, part] of list.entries()) {
      for (const importName of part) {
        if (importName.includes(' as ')) {
          const v = importName.split(' as ');
          importNames.push([v[0].trim(), v[1].trim()]);
        } else {
          const isDefault = index === 0;
          importNames.push(isDefault ? ['default', importName] : [importName]);
        }
      }
    }
  }

  return importNames;
}
