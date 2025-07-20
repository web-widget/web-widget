type ElementBounds = {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
} | null;

/**
 * Check if DOMRect is valid (has actual dimensions)
 */
function isValidRect(rect: DOMRect): boolean {
  return rect.width > 0 || rect.height > 0;
}

/**
 * Merge multiple DOMRects into one containing all rectangular areas
 */
function mergeRects(rects: DOMRect[]): ElementBounds {
  if (rects.length === 0) return null;

  let top = Infinity,
    left = Infinity,
    right = -Infinity,
    bottom = -Infinity;

  for (const rect of rects) {
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  return {
    top,
    left,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Get all valid layout boxes (visual boxes) of a node and all its descendant nodes
 *
 * ✅ Supports:
 * - Element boxes
 * - display: contents elements
 * - Shadow DOM subtrees
 * - <slot> distributed nodes
 * - Text nodes (measured via Range)
 *
 * ❌ Not supported (technical limitations or high complexity):
 * - ::before / ::after pseudo-elements (no corresponding DOM nodes)
 * - Anonymous boxes (like blocks in editable areas)
 * - Overflow clipping hints
 * - clip-path / mask visual area restrictions
 * - Range.getClientRects (multi-line text split into multiple rects)
 */
function getNodeRectsDeep(node: Node): DOMRect[] {
  const rects: DOMRect[] = [];

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const style = getComputedStyle(el);

    // Ignore display: none elements
    if (style.display === 'none') return [];

    // Self visual box (display: contents elements may have no size themselves, but still recurse their children)
    const rect = el.getBoundingClientRect();
    if (isValidRect(rect)) rects.push(rect);

    // Shadow DOM child elements (like Web Components)
    const children = el.shadowRoot
      ? Array.from(el.shadowRoot.children)
      : Array.from(el.children);

    for (const child of children) {
      rects.push(...getNodeRectsDeep(child));
    }

    // If it's a <slot> element, get its distributed real nodes
    if (el.tagName === 'SLOT') {
      const assigned = (el as HTMLSlotElement).assignedNodes({ flatten: true });
      for (const assignedNode of assigned) {
        rects.push(...getNodeRectsDeep(assignedNode));
      }
    }
  } else if (node.nodeType === Node.TEXT_NODE) {
    // Text nodes use Range to measure their visual box (default merge all fragments into one rect)
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (isValidRect(rect)) rects.push(rect);
  }

  return rects;
}

/**
 * Get the complete visual box of any element (including areas expanded by child elements)
 *
 * ✅ Includes child elements, Shadow DOM, slot content, etc. that expand the size
 * ❌ Does not include pseudo-elements, anonymous layout boxes, clip clipping areas
 */
export function getElementBox(el: Element): ElementBounds {
  const allRects = getNodeRectsDeep(el);
  return mergeRects(allRects);
}
