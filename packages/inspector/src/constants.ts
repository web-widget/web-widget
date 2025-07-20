/**
 * Z-Index hierarchy for Web Widget Inspector
 *
 * Hierarchy (from highest to lowest):
 * 1. Tooltip/Bubble (2147483647) - Highest priority, always on top
 * 2. Toolbar (2147483646) - Inspector controls, always visible
 * 3. Overlay (2147483645) - Element highlighting during inspection
 * 4. Page elements (default) - Normal page content
 */

export const Z_INDEX = {
  /** Tooltip/Bubble - Highest priority for information display */
  TOOLTIP: 2147483647,

  /** Toolbar - Inspector controls and UI */
  TOOLBAR: 2147483646,

  /** Overlay - Element highlighting during inspection mode */
  OVERLAY: 2147483645,

  /** Page elements - Default z-index for normal content */
  PAGE_ELEMENTS: 'auto',
} as const;

/**
 * CSS custom properties for z-index values
 */
export const Z_INDEX_CSS = {
  '--wwi-z-tooltip': Z_INDEX.TOOLTIP.toString(),
  '--wwi-z-toolbar': Z_INDEX.TOOLBAR.toString(),
  '--wwi-z-overlay': Z_INDEX.OVERLAY.toString(),
} as const;
