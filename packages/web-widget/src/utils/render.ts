import type { WidgetModuleLoader } from '@web-widget/schema';
import { WEB_WIDGET_PENDING_SLOT_NAME } from '../constants';
import {
  WEB_WIDGET_PENDING_LOCAL_NAME,
  type WebWidgetPendingBoundary,
} from '../types';

const MODULE_REG =
  /\b(?:import|__vite_ssr_dynamic_import__)\(["'`]([^"'`]*)["'`]\)/;

function escapeAttributeValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function serializeAttributes(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(
      ([name, value]) =>
        `${name}${value === '' ? '' : `="${escapeAttributeValue(value)}"`}`
    )
    .join(' ');
}

export function createPendingBoundary(
  renderTarget: 'light' | 'shadow' | undefined
): WebWidgetPendingBoundary {
  return {
    ariaBusy: true,
    display: 'contents',
    localName: WEB_WIDGET_PENDING_LOCAL_NAME,
    slot: renderTarget === 'shadow' ? WEB_WIDGET_PENDING_SLOT_NAME : '',
  };
}

export function serializePendingBoundary(
  boundary: WebWidgetPendingBoundary,
  content: string
): string {
  if (!content) return '';
  const slot = boundary.slot ? ` slot="${boundary.slot}"` : '';
  return `<${boundary.localName} aria-busy="true"${slot} style="display:${boundary.display}">${content}</${boundary.localName}>`;
}

export function parseModuleId(loader: WidgetModuleLoader) {
  const match = String(loader).match(MODULE_REG);
  const id = match?.[1];
  if (!id) {
    throw new Error(`The url for the module was not found: ${loader}`);
  }
  return id;
}

export function unsafePropsToAttrs(props: any) {
  return Object.entries(props).reduce(
    (attrs, [key, value]) => {
      if (typeof value === 'string') {
        attrs[key.toLowerCase()] = value;
      } else if (typeof value === 'number') {
        attrs[key.toLowerCase()] = String(value);
      } else if (value === true) {
        attrs[key.toLowerCase()] = '';
      }
      return attrs;
    },
    {} as Record<string, string>
  );
}

export function getClientModuleId(
  loader: WidgetModuleLoader,
  options: {
    import?: string;
    base?: string;
  }
) {
  return options.import
    ? options.import
    : options.base && !options.base.startsWith('file://')
      ? options.base + parseModuleId(loader)
      : parseModuleId(loader);
}

export function getDisplayModuleId(
  loader: WidgetModuleLoader,
  options: {
    base?: string;
  }
) {
  return options.base?.startsWith('file://')
    ? new URL(parseModuleId(loader), options.base).href
    : parseModuleId(loader);
}
