/**
 * Adopted from Fresh
 *
 * https://github.com/denoland/fresh/blob/main/LICENSE
 */
export function sortRoutePaths(a: string, b: string) {
  const aLen = a.length;
  const bLen = b.length;

  let segment = false;
  let aIdx = 0;
  let bIdx = 0;
  for (; aIdx < aLen && bIdx < bLen; aIdx++, bIdx++) {
    const charA = a.charAt(aIdx);
    const charB = b.charAt(bIdx);

    // When comparing a grouped route with a non-grouped one, we
    // need to skip over the group name to effectively compare the
    // actual route.
    if (charA === '(' && charB !== '(') {
      if (charB == '[') return -1;
      return 1;
    } else if (charB === '(' && charA !== '(') {
      if (charA == '[') return 1;
      return -1;
    }

    if (charA === '/' || charB === '/') {
      segment = true;

      // If the other path doesn't close the segment
      // then we don't need to continue
      if (charA !== '/') return 1;
      if (charB !== '/') return -1;

      continue;
    }

    if (segment) {
      segment = false;

      const scoreA = getRoutePathScore(charA, a, aIdx);
      const scoreB = getRoutePathScore(charB, b, bIdx);
      if (scoreA === scoreB) {
        if (charA !== charB) {
          return charA < charB ? -1 : 1;
        }
        continue;
      }

      return scoreA > scoreB ? -1 : 1;
    }

    if (charA !== charB) {
      return charA < charB ? -1 : 1;
    }
  }

  // Shared prefix ended because one string ended: shorter path wins when the
  // longer path continues with `/` + dynamic or `/` + static segment.
  if (aIdx >= aLen && bIdx >= bLen) {
    return 0;
  }
  if (aIdx >= aLen && bIdx < bLen) {
    return prefixContinuationOrder(b, bIdx);
  }
  if (bIdx >= bLen && aIdx < aLen) {
    return -prefixContinuationOrder(a, aIdx);
  }

  return 0;
}

/** Negative if the shorter path (already matched) should sort before `longer`. */
function prefixContinuationOrder(longer: string, from: number): number {
  const kind = segmentTailKind(longer, from);
  return kind !== TailKind.Neutral ? -1 : 0;
}

const enum TailKind {
  Neutral = 0,
  Dynamic = 1,
  Static = 2,
}

/** Classify `path[from..]` after a full segment boundary (must start with `/`). */
function segmentTailKind(path: string, from: number): TailKind {
  if (from >= path.length || path.charCodeAt(from) !== 47 /* / */) {
    return TailKind.Neutral;
  }
  const c = path.charCodeAt(from + 1);
  if (!c) {
    return TailKind.Neutral;
  }
  if (
    c === 58 /* : */ ||
    c === 42 /* * */ ||
    c === 123 /* { */ ||
    c === 91 /* [ */
  ) {
    return TailKind.Dynamic;
  }
  if (
    (c >= 97 && c <= 122) ||
    (c >= 65 && c <= 90) ||
    (c >= 48 && c <= 57) ||
    c === 95 /* _ */
  ) {
    return TailKind.Static;
  }
  return TailKind.Neutral;
}

/**
 * Assign a score based on the first character of a path segment.
 * The goal is to sort `[` or `[...` last respectively.
 */
function getRoutePathScore(char: string, s: string, i: number): number {
  if (char === '_') {
    return 4;
  } else if (char === '[') {
    if (i + 1 < s.length && s[i + 1] === '.') {
      return 0;
    }
    return 1;
  } else if (char === ':') {
    // Named / repeated params (`:id`, `:rest*`) — less specific than a static segment.
    return 1;
  }

  if (
    i + 4 === s.length - 1 &&
    char === 'i' &&
    s[i + 1] === 'n' &&
    s[i + 2] === 'd' &&
    s[i + 3] === 'e' &&
    s[i + 4] === 'x'
  ) {
    return 3;
  }

  return 2;
}

/**
 * Transform a filesystem URL path to a `path-to-regex` style matcher.
 */
export function pathToPattern(
  path: string,
  options?: { keepGroups: boolean }
): string {
  const parts = path.split('/');
  if (parts[parts.length - 1] === 'index') {
    if (parts.length === 1) {
      return '/';
    }
    parts.pop();
  }

  let route = '';

  let nonOptionalSegments = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Case: /[...foo].tsx
    if (part.startsWith('[...') && part.endsWith(']')) {
      route += `/:${part.slice(4, part.length - 1)}*`;
      continue;
    }

    // Route groups like /foo/(bar) should not be included in URL
    // matching. They are transparent and need to be removed here.
    // Case: /foo/(bar) -> /foo
    // Case: /foo/(bar)/bob -> /foo/bob
    // Case: /(foo)/bar -> /bar
    if (!options?.keepGroups && part.startsWith('(') && part.endsWith(')')) {
      continue;
    }

    // Disallow neighbouring params like `/[id][bar].tsx` because
    // it's ambiguous where the `id` param ends and `bar` begins.
    if (part.includes('][')) {
      throw new SyntaxError(
        `Invalid route pattern: "${path}". A parameter cannot be followed by another parameter without any characters in between.`
      );
    }

    // Case: /[[id]].tsx
    // Case: /[id].tsx
    // Case: /[id]@[bar].tsx
    // Case: /[id]-asdf.tsx
    // Case: /[id]-asdf[bar].tsx
    // Case: /asdf[bar].tsx
    let pattern = '';
    let groupOpen = 0;
    let optional = false;
    for (let j = 0; j < part.length; j++) {
      const char = part[j];
      if (char === '[') {
        if (part[j + 1] === '[') {
          // Disallow optional dynamic params like `foo-[[bar]]`
          if (part[j - 1] !== '/' && !!part[j - 1]) {
            throw new SyntaxError(
              `Invalid route pattern: "${path}". An optional parameter needs to be a full segment.`
            );
          }
          groupOpen++;
          optional = true;
          pattern += '{/';
          j++;
        }
        pattern += ':';
        groupOpen++;
      } else if (char === ']') {
        if (part[j + 1] === ']') {
          // Disallow optional dynamic params like `[[foo]]-bar`
          if (part[j + 2] !== '/' && !!part[j + 2]) {
            throw new SyntaxError(
              `Invalid route pattern: "${path}". An optional parameter needs to be a full segment.`
            );
          }
          groupOpen--;
          pattern += '}?';
          j++;
        }
        if (--groupOpen < 0) {
          throw new SyntaxError(`Invalid route pattern: "${path}"`);
        }
      } else {
        pattern += char;
      }
    }

    if (optional) {
      route += pattern;
    } else {
      nonOptionalSegments++;
      route += '/' + pattern;
    }
  }

  // Case: /(group)/index.tsx
  if (route === '') {
    route = '/';
  }

  // Handles all cases where a route starts with
  // an optional parameter and does not contain
  // any non-group and non-optional segments after
  // Case: /[[id]].tsx
  // Case: /(group)/[[id]].tsx
  // Case: /(group)/[[name]]/(group2)/index.tsx
  if (route.startsWith(`{/`) && nonOptionalSegments === 0) {
    route = route.replace('{/', '/{');
  }

  return route;
}
