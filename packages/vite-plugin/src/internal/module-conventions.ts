/** Separators supported between a module name and its Web Widget marker. */
export const MODULE_MARKER_SEPARATOR_PATTERN = '[.@]';

export const ACTION_MARKER_PATTERN = `${MODULE_MARKER_SEPARATOR_PATTERN}action`;
export const ROUTE_MARKER_PATTERN = `${MODULE_MARKER_SEPARATOR_PATTERN}route`;
export const WIDGET_MARKER_PATTERN = `${MODULE_MARKER_SEPARATOR_PATTERN}widget`;
export const ROUTE_OR_WIDGET_MARKER_PATTERN = `${MODULE_MARKER_SEPARATOR_PATTERN}(?:route|widget)`;

export const ACTION_MODULE_PATTERN = new RegExp(
  `${ACTION_MARKER_PATTERN}\\..*$`
);
export const WIDGET_MODULE_PATTERN = new RegExp(`${WIDGET_MARKER_PATTERN}\\.`);
export const ROUTE_OR_WIDGET_MARKER_AT_END_PATTERN = new RegExp(
  `${ROUTE_OR_WIDGET_MARKER_PATTERN}$`
);
