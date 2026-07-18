import type { HTMLWebWidgetElement } from '@web-widget/web-widget/element';

declare global {
  interface Window {
    __hydrationErrors: unknown[];
    __hydrationReady: Promise<void>;
    __mountLateSolid: () => Promise<void>;
    __raceBeforeMount?: Promise<void>;
    __releaseRace?: () => void;
    __raceWaiting?: number;
    __ssrNodes: Record<string, Node>;
    __versionReloadStarted?: boolean;
  }

  interface HTMLElementTagNameMap {
    'web-widget': HTMLWebWidgetElement;
  }
}

export {};
