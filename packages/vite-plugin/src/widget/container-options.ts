import type { WidgetRenderTarget } from '@/types';

const STATIC_RENDER_TARGET_ERROR =
  `Widget renderTarget must be statically defined as "light" or "shadow". ` +
  `The build uses it to determine whether Widget CSS belongs in the document head or the ShadowRoot.`;

/**
 * Reads a statically declared render target from a `container()` options
 * object. Other option values may remain dynamic, but constructs that can
 * define or overwrite `renderTarget` without a literal value are rejected.
 *
 * This scanner is deliberately local to the already-located object literal.
 * It tracks strings, comments, and nested delimiters so commas inside option
 * values do not look like top-level property separators.
 */
export function analyzeContainerRenderTarget(
  code: string,
  objectStart: number
): WidgetRenderTarget | undefined {
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let depth = 0;
  let propertyStart = objectStart + 1;
  const properties: string[] = [];

  for (let index = objectStart; index < code.length; index++) {
    const char = code[index];
    const next = code[index + 1];

    if (lineComment) {
      if (char === '\n' || char === '\r') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index++;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index++;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{' || char === '[' || char === '(') {
      depth++;
      continue;
    }
    if (char === '}' || char === ']' || char === ')') {
      depth--;
      if (depth === 0) {
        properties.push(code.slice(propertyStart, index));
        return resolveRenderTarget(properties);
      }
      continue;
    }
    if (char === ',' && depth === 1) {
      properties.push(code.slice(propertyStart, index));
      propertyStart = index + 1;
    }
  }

  throw new SyntaxError(
    `Malformed container() options: unclosed object literal.`
  );
}

function resolveRenderTarget(
  properties: string[]
): WidgetRenderTarget | undefined {
  // Property slices retain comments from the source. Remove only leading
  // trivia; comments inside values must remain part of the static-value check.
  const normalizedProperties = properties.map((property) =>
    property.replace(/^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*/, '')
  );
  const renderTargetProperties = normalizedProperties.filter((property) =>
    /^\s*(?:renderTarget|(['"])renderTarget\1)\s*:/.test(property)
  );

  if (renderTargetProperties.length > 1) {
    throw new SyntaxError(
      `${STATIC_RENDER_TARGET_ERROR} Duplicate renderTarget properties are not allowed.`
    );
  }

  // A spread or computed key can introduce renderTarget even when the source
  // does not contain a visibly named property, so neither is statically safe.
  if (normalizedProperties.some((property) => /^\s*\.\.\./.test(property))) {
    throw new SyntaxError(
      `${STATIC_RENDER_TARGET_ERROR} Spread properties may override renderTarget.`
    );
  }
  if (normalizedProperties.some((property) => /^\s*\[/.test(property))) {
    throw new SyntaxError(
      `${STATIC_RENDER_TARGET_ERROR} Computed properties may define renderTarget.`
    );
  }

  // Shorthand properties and accessors name renderTarget without providing a
  // direct string literal that the asset pipeline can consume.
  const hasDynamicNamedProperty = normalizedProperties.some((property) => {
    const namesRenderTarget =
      /^\s*(?:renderTarget\b|(?:get|set)\s+renderTarget\b)/.test(property);
    return namesRenderTarget && !/^\s*renderTarget\s*:/.test(property);
  });
  if (hasDynamicNamedProperty) {
    throw new SyntaxError(STATIC_RENDER_TARGET_ERROR);
  }

  const property = renderTargetProperties[0];
  if (!property) return undefined;

  const valueSource = property.slice(property.indexOf(':') + 1).trim();
  const match = valueSource.match(/^(['"])(light|shadow)\1\s*$/);
  if (!match) throw new SyntaxError(STATIC_RENDER_TARGET_ERROR);
  return match[2] as WidgetRenderTarget;
}
