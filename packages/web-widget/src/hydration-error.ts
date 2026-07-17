export const HYDRATION_ERROR_EVENT = 'web-widget:hydration-error';

export type HydrationErrorPhase =
  'module-import' | 'adapter-bootstrap' | 'mismatch' | 'boundary-recovery';

export interface HydrationErrorDetail {
  moduleURL: string;
  adapter: string;
  phase: HydrationErrorPhase;
  error: unknown;
}

export type HydrationErrorEvent = CustomEvent<HydrationErrorDetail>;

export function dispatchHydrationError(
  target: EventTarget,
  detail: HydrationErrorDetail
): boolean {
  return target.dispatchEvent(
    new CustomEvent<HydrationErrorDetail>(HYDRATION_ERROR_EVENT, {
      bubbles: true,
      composed: true,
      detail,
    })
  );
}

declare global {
  interface HTMLElementEventMap {
    'web-widget:hydration-error': HydrationErrorEvent;
  }
}
