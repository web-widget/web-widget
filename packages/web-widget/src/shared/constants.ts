/** Internal element used as the framework mount/hydration container. */
export const WEB_WIDGET_ROOT_LOCAL_NAME = 'web-widget-root';

/** Protected value used by parent frameworks to preserve Widget SSR content. */
export const INNER_HTML_PLACEHOLDER = '<!--web-widget:placeholder-->';

/** Internal event emitted whenever the recovering boundary changes. */
export const WEB_WIDGET_RECOVERING_CHANGE_EVENT = 'web-widget:recoveringchange';

/** Reserved slot name for pending UI owned by the widget lifecycle. */
export const WEB_WIDGET_PENDING_SLOT_NAME = 'web-widget-pending';

/** Stable reserved slot for lifecycle state transfer scripts. */
export const WEB_WIDGET_STATE_SLOT_NAME = 'web-widget-state';
