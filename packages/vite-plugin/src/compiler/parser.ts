type ImportBinding = [name: string, alias?: string];

/**
 * Extracts all import bindings from an import statement.
 * Handles default imports, named imports, and aliases.
 *
 * @param importStatement - The import statement to parse
 * @returns Array of import bindings as [originalName, alias?] tuples
 *
 * @example
 * ```typescript
 * extractImportBindings('import { html, css as litCss } from "lit"')
 * // => [['html'], ['css', 'litCss']]
 *
 * extractImportBindings('import React from "react"')
 * // => [['default', 'React']]
 * ```
 */
export function extractImportBindings(
  importStatement: string
): ImportBinding[] {
  const bindings: ImportBinding[] = [];

  // Remove comments and normalize whitespace
  const normalizedCode = importStatement
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedCode.includes('from')) {
    return bindings;
  }

  let importParts: [defaultAndNamespacesPart: string, namedImportsPart: string];

  // Parse named imports (with braces) vs default/namespace imports
  if (normalizedCode.includes('{')) {
    const braceStart = normalizedCode.indexOf('{');
    const braceEnd = normalizedCode.indexOf('}');
    const defaultAndNamespacesPart = normalizedCode.substring(6, braceStart);
    const namedImportsPart = normalizedCode.substring(braceStart + 1, braceEnd);
    importParts = [defaultAndNamespacesPart, namedImportsPart];
  } else {
    const fromIndex = normalizedCode.indexOf('from');
    const defaultAndNamespacesPart = normalizedCode.substring(6, fromIndex);
    importParts = [defaultAndNamespacesPart, ''];
  }

  // Split and clean import names
  const importNameLists = importParts.map((part) =>
    part
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );

  // Process each import name and create bindings
  for (const [partIndex, nameList] of importNameLists.entries()) {
    for (const importName of nameList) {
      if (importName.includes(' as ')) {
        // Handle aliased imports: "originalName as alias"
        const [originalName, alias] = importName
          .split(' as ')
          .map((s) => s.trim());
        bindings.push([originalName, alias]);
      } else {
        // Handle non-aliased imports
        const isDefaultImport = partIndex === 0;
        bindings.push(isDefaultImport ? ['default', importName] : [importName]);
      }
    }
  }

  return bindings;
}
