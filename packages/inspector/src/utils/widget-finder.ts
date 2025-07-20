/**
 * Web Widget element finder utility
 * Responsible for locating and identifying web-widget elements in the DOM
 */

export function findWebWidgetContainer(
  element: HTMLElement | null
): HTMLElement | null {
  if (!element) {
    return null;
  }

  if (element.tagName === 'WEB-WIDGET' && element.hasAttribute('import')) {
    return element;
  }

  const container = element.closest('web-widget[import]') as HTMLElement;
  return container;
}
